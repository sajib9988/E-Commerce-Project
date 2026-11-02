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

  async createRequest(userId: string, orderId: string, reason: string, note?: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: orderId, userId }, include: { paymentAttempts: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.paymentStatus !== 'PAID' || ['CANCELLED', 'REFUNDED'].includes(order.status)) {
        throw new ConflictException('Only paid, non-cancelled orders can be submitted for refund');
      }
      const existing = await tx.refundRequest.findFirst({ where: { orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'REFUNDED'] } } });
      if (existing) throw new ConflictException('A refund request already exists for this order');
      const attempt = order.paymentAttempts.filter(a => a.status === 'SUCCEEDED' && a.stripePaymentIntentId).sort((a,b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0))[0];
      if (!attempt?.stripePaymentIntentId) throw new ConflictException('No successful Stripe payment is available to refund');
      return tx.refundRequest.create({ data: {
        orderId, userId, paymentAttemptId: attempt.id, reason: reason.trim(),
        customerNote: note?.trim() || null, requestedAmount: order.totalAmount,
      } });
    });
  }

  async findMine(userId: string) {
    return this.prisma.refundRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' },
      include: { order: { select: { id: true, orderNumber: true, status: true, totalAmount: true, currency: true } } } });
  }

  async findPending() {
    return this.prisma.refundRequest.findMany({ where: { status: { in: ['PENDING', 'FAILED'] } },
      include: { order: { select: { id: true, orderNumber: true, totalAmount: true, currency: true, paymentStatus: true } },
        user: { select: { id: true, name: true, email: true } }, paymentAttempt: { select: { stripePaymentIntentId: true } } },
      orderBy: { createdAt: 'asc' } });
  }

  async resolve(requestId: string, adminId: string, decision: 'APPROVE' | 'REJECT', note?: string) {
    const request = await this.prisma.refundRequest.findUnique({ where: { id: requestId }, include: { paymentAttempt: true, order: true } });
    if (!request) throw new NotFoundException('Refund request not found');
    if (decision === 'REJECT') {
      const rejected = await this.prisma.refundRequest.updateMany({ where: { id: requestId, status: 'PENDING' },
        data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date(), adminNote: note?.trim() || null } });
      if (!rejected.count) throw new ConflictException('Only pending refund requests can be rejected');
      return this.prisma.refundRequest.findUnique({ where: { id: requestId } });
    }
    if (!request.paymentAttempt.stripePaymentIntentId) throw new ConflictException('PaymentIntent is missing; refund cannot be automated');
    const claimed = await this.prisma.refundRequest.updateMany({ where: { id: requestId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PROCESSING', reviewedBy: adminId, reviewedAt: new Date(), adminNote: note?.trim() || null, failureReason: null } });
    if (!claimed.count) throw new ConflictException('Refund request is already being processed or resolved');

    try {
      const amount = new Prisma.Decimal(request.requestedAmount.toString()).mul(100);
      if (!amount.isInteger() || !Number.isSafeInteger(amount.toNumber())) throw new BadRequestException('Invalid refund amount precision');
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: request.paymentAttempt.stripePaymentIntentId,
        amount: amount.toNumber(),
        reason: 'requested_by_customer',
        metadata: { refundRequestId: request.id, orderId: request.orderId, approvedBy: adminId },
      }, { idempotencyKey: `refund-request:${request.id}` });
      return this.prisma.$transaction(async tx => {
        const updated = await tx.refundRequest.update({ where: { id: requestId },
          data: { status: 'REFUNDED', stripeRefundId: stripeRefund.id } });
        await tx.order.update({ where: { id: request.orderId }, data: { status: 'REFUNDED' } });
        return updated;
      });
    } catch (error) {
      await this.prisma.refundRequest.update({ where: { id: requestId },
        data: { status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 500) : 'Stripe refund failed' } });
      throw new ServiceUnavailableException('Stripe refund could not be confirmed. Check Stripe dashboard before retrying.');
    }
  }
}
