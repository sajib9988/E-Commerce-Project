import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundsService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    this.stripe = new Stripe(key);
  }

  async createRequest(userId: string, orderId: string, reason: string, customerNote: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { paymentAttempts: { where: { status: 'SUCCEEDED' }, orderBy: { paidAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID' || order.status === 'REFUNDED' || order.status === 'CANCELLED') {
      throw new ConflictException('This order is not eligible for a refund request');
    }
    const payment = order.paymentAttempts.find((attempt) => Boolean(attempt.stripePaymentIntentId));
    if (!payment?.stripePaymentIntentId) throw new ConflictException('No successful Stripe payment is available for refund');
    const pending = await this.prisma.refundRequest.findFirst({
      where: { orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } },
    });
    if (pending) throw new ConflictException('A refund request already exists for this order');
    const priorRefund = await this.prisma.refundRequest.findFirst({ where: { orderId, status: 'REFUNDED' } });
    if (priorRefund) throw new ConflictException('This order has already been refunded');
    return this.prisma.refundRequest.create({
      data: { orderId, userId, reason: reason.trim(), customerNote: customerNote.trim(), amount: order.totalAmount },
      select: { id: true, orderId: true, status: true, reason: true, customerNote: true, amount: true, createdAt: true },
    });
  }

  findMine(userId: string) {
    return this.prisma.refundRequest.findMany({
      where: { userId }, include: { order: { select: { id: true, orderNumber: true, status: true, totalAmount: true, currency: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineById(userId: string, id: string) {
    const request = await this.prisma.refundRequest.findFirst({ where: { id, userId }, include: { order: { select: { id: true, orderNumber: true, status: true, totalAmount: true, currency: true } } } });
    if (!request) throw new NotFoundException('Refund request not found');
    return request;
  }

  findAllForAdmin(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'REFUNDED' | 'FAILED') {
    return this.prisma.refundRequest.findMany({
      where: status ? { status } : {},
      include: { user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true, currency: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string, adminId: string, adminNote?: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id }, include: { order: { include: { paymentAttempts: { where: { status: 'SUCCEEDED' } } } } },
    });
    if (!request) throw new NotFoundException('Refund request not found');
    if (!['PENDING', 'PROCESSING'].includes(request.status)) {
      throw new ConflictException('Refund request is not awaiting approval');
    }
    const attempt = request.order.paymentAttempts.find((item) => Boolean(item.stripePaymentIntentId));
    if (!attempt?.stripePaymentIntentId) throw new ConflictException('Successful Stripe PaymentIntent not found');

    await this.prisma.refundRequest.updateMany({
      where: { id, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'PROCESSING', reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote?.trim() },
    });

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: attempt.stripePaymentIntentId,
        // Full refund only. Amount is taken from the server-side successful payment/order.
        metadata: { refundRequestId: request.id, orderId: request.orderId, reviewedBy: adminId },
      }, { idempotencyKey: `refund-request:${request.id}` });

      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.refundRequest.update({
          where: { id: request.id },
          data: { status: 'REFUNDED', stripeRefundId: refund.id, processedAt: new Date(),
            reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote?.trim() },
        });
        await tx.order.update({ where: { id: request.orderId }, data: { status: 'REFUNDED' } });
        return updated;
      });
    } catch {
      // Keep PROCESSING: Stripe may have accepted the request despite a network timeout.
      // Retry uses the same Stripe idempotency key and cannot create a second refund.
      throw new ServiceUnavailableException('Stripe refund outcome is being reconciled. Retry this same approval; do not create a new request.');
    }
  }

  async reject(id: string, adminId: string, adminNote: string) {
    if (!adminNote?.trim() || adminNote.trim().length < 3) throw new BadRequestException('A rejection reason is required');
    const result = await this.prisma.refundRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote.trim() },
    });
    if (!result.count) {
      const exists = await this.prisma.refundRequest.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Refund request not found');
      throw new ConflictException('Only pending refund requests can be rejected');
    }
    return this.prisma.refundRequest.findUnique({ where: { id } });
  }
}
