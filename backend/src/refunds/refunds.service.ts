import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
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
    return this.prisma.$transaction(async (tx) => {
      // Serialize concurrent requests for the same order before checking duplicates.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Order not found');
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { paymentAttempts: { where: { status: 'SUCCEEDED' }, orderBy: { paidAt: 'desc' } } },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.paymentStatus !== 'PAID' || order.status === 'REFUNDED' || order.status === 'CANCELLED') {
        throw new ConflictException('This order is not eligible for a refund request');
      }
      const paymentAttempts = order.paymentAttempts.filter((attempt) => Boolean(attempt.stripePaymentIntentId));
      if (!paymentAttempts.length) throw new ConflictException('No successful Stripe payment is available for refund');
      if (paymentAttempts.length > 1) throw new ConflictException('Multiple successful captures require manual payment review before a refund request');
      const existing = await tx.refundRequest.findFirst({
        where: { orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'REFUNDED'] } },
      });
      if (existing) throw new ConflictException('An active or completed refund request already exists for this order');
      return tx.refundRequest.create({
        data: { orderId, userId, reason: reason.trim(), customerNote: customerNote.trim(), amount: order.totalAmount },
        select: { id: true, orderId: true, status: true, reason: true, customerNote: true, amount: true, createdAt: true },
      });
    }, { isolationLevel: 'Serializable' });
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

    if (request.order.paymentAttempts.filter((item) => Boolean(item.stripePaymentIntentId)).length !== 1) {
      throw new ConflictException('Multiple successful captures require manual payment review');
    }

    // Normal refunds are allowed only before Apliiq accepts the fulfillment.
    // If the provider has an external order or its submission state is uncertain,
    // stop here and require a manual provider-side cancellation/reconciliation first.
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { orderId_provider: { orderId: request.orderId, provider: 'APLIIQ' } },
    });
    const providerCancelled = ['cancelled', 'canceled'].includes(
      (fulfillment?.providerStatus ?? '').trim().toLowerCase(),
    );
    const safeBeforeProviderAcceptance = !fulfillment
      || fulfillment.submissionStatus === 'QUEUED'
      || (fulfillment.submissionStatus === 'CANCELLED' && providerCancelled && !fulfillment.shippedAt);
    if (!safeBeforeProviderAcceptance || (fulfillment?.externalOrderId && !providerCancelled)) {
      throw new ConflictException(
        'Apliiq has accepted or may have accepted this order. Normal refund is blocked; reconcile/cancel with Apliiq and use the exceptional manual process.',
      );
    }

    // Claim PENDING before calling Stripe. A concurrent rejection can no longer
    // race past this transition; retries are allowed only for PROCESSING requests.
    const claim = await this.prisma.refundRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'PROCESSING', reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote?.trim() },
    });
    if (claim.count === 0) {
      const current = await this.prisma.refundRequest.findUnique({ where: { id }, select: { status: true } });
      if (current?.status !== 'PROCESSING') {
        throw new ConflictException('Refund request is no longer pending approval');
      }
    }

    try {
      // Check provider metadata as well as the idempotency key. Stripe may expire
      // idempotency records after its retention window; this prevents a late retry
      // from creating a second refund for the same request.
      const priorRefunds = await this.stripe.refunds.list({ payment_intent: attempt.stripePaymentIntentId, limit: 100 });
      const existingRefund = priorRefunds.data.find((item) => item.metadata?.refundRequestId === request.id);
      const refund = existingRefund ?? await this.stripe.refunds.create({
        payment_intent: attempt.stripePaymentIntentId,
        // Full refund only. Amount is taken from the server-side successful payment/order.
        metadata: { refundRequestId: request.id, orderId: request.orderId, reviewedBy: adminId },
      }, { idempotencyKey: `refund-request:${request.id}` });

      return await this.prisma.$transaction(async (tx) => {
        const finalStatus = refund.status === 'succeeded' ? 'REFUNDED'
          : refund.status === 'failed' || refund.status === 'canceled' ? 'FAILED' : 'PROCESSING';
        const updated = await tx.refundRequest.update({
          where: { id: request.id },
          data: { status: finalStatus, stripeRefundId: refund.id,
            processedAt: finalStatus === 'REFUNDED' ? new Date() : null,
            reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote?.trim() },
        });
        if (finalStatus === 'REFUNDED') {
          await tx.order.update({ where: { id: request.orderId }, data: { status: 'REFUNDED' } });
        }
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
