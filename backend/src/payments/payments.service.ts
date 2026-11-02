import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PaymentAttemptStatus, PaymentStatus, OrderStatus } from '../../generated/prisma/enums';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    const frontendUrl = config.get<string>('FRONTEND_URL');

    if (!secretKey || !frontendUrl) {
      throw new Error('STRIPE_SECRET_KEY and FRONTEND_URL are required');
    }

    this.stripe = new Stripe(secretKey);
    this.frontendUrl = frontendUrl.replace(/\/$/, '');
  }

  // USD-style, two-decimal currency only. Never use JS float for money math.
  private toMinorUnits(amount: Prisma.Decimal): number {
    const minor = amount.mul(100);
    if (!minor.isInteger()) {
      throw new BadRequestException('Order total has invalid currency precision');
    }
    const value = minor.toNumber();
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new BadRequestException('Order total is invalid');
    }
    return value;
  }

  async createCheckoutSession(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }
    if (!order.items.length) {
      throw new BadRequestException('Cannot pay for an empty order');
    }

    // Reuse an existing open session on retries instead of creating another charge path.
    const currentAttempt = await this.prisma.paymentAttempt.findFirst({
      where: { orderId: order.id, status: PaymentAttemptStatus.CREATED },
      orderBy: { createdAt: 'desc' },
    });

    if (currentAttempt?.stripeCheckoutSessionId) {
      let currentSession: Stripe.Checkout.Session;
      try {
        currentSession = await this.stripe.checkout.sessions.retrieve(
          currentAttempt.stripeCheckoutSessionId,
        );
      } catch {
        // An unknown Stripe state must not trigger a second Checkout Session.
        throw new ServiceUnavailableException(
          'Could not confirm the existing payment session. Please retry shortly.',
        );
      }

      if (currentSession.status === 'open' && currentSession.url) {
        return { checkoutUrl: currentSession.url, orderId: order.id };
      }
      if (currentSession.status === 'complete') {
        throw new ConflictException(
          'Payment is processing. Wait for the payment confirmation before retrying.',
        );
      }

      await this.prisma.paymentAttempt.updateMany({
        where: { id: currentAttempt.id, status: PaymentAttemptStatus.CREATED },
        data: { status: PaymentAttemptStatus.CANCELLED },
      });
    }

    // Lock the order row so simultaneous requests reuse one attempt.
    // Stripe's idempotency key below makes concurrent calls for that attempt converge
    // on the same Checkout Session even if both requests reach Stripe together.
    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${order.id} FOR UPDATE`;
      const active = await tx.paymentAttempt.findFirst({
        where: { orderId: order.id, status: PaymentAttemptStatus.CREATED },
        orderBy: { createdAt: 'desc' },
      });
      if (active) return active;

      return tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          provider: 'STRIPE',
          status: PaymentAttemptStatus.CREATED,
          amount: order.totalAmount,
          currency: order.currency.toLowerCase(),
        },
      });
    });

    try {
      const amount = this.toMinorUnits(order.totalAmount);
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: order.currency.toLowerCase(),
                product_data: {
                  name: `Order ${order.orderNumber}`,
                  description: `Payment for order ${order.orderNumber}`,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          client_reference_id: order.id,
          metadata: {
            orderId: order.id,
            paymentAttemptId: attempt.id,
          },
          success_url: `${this.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${this.frontendUrl}/checkout/cancel?orderId=${encodeURIComponent(order.id)}`,
        },
        { idempotencyKey: `checkout-attempt:${attempt.id}` },
      );

      if (!session.url) {
        throw new Error('Stripe did not return a Checkout URL');
      }

      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { stripeCheckoutSessionId: session.id },
      });

      return { checkoutUrl: session.url, orderId: order.id };
    } catch {
      // Keep the attempt CREATED if Stripe's response was ambiguous. Reusing its
      // idempotency key is safer than marking it failed and creating a new session.
      throw new ServiceUnavailableException(
        'Could not confirm Stripe Checkout creation. Please retry the same order.',
      );
    }
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
    const orderId = session.metadata?.orderId;
    const attemptId = session.metadata?.paymentAttemptId;

    if (!orderId || !attemptId || session.payment_status !== 'paid') {
      throw new BadRequestException('Checkout session is not a paid, linked session');
    }

    await this.prisma.$transaction(async (tx) => {
      // Serialize distinct Stripe event IDs referring to the same order.
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const eventClaim = await tx.stripeWebhookEvent.createMany({
        data: [{ id: eventId, type: 'checkout.session.completed' }],
        skipDuplicates: true,
      });
      if (eventClaim.count === 0) return;

      const attempt = await tx.paymentAttempt.findFirst({
        where: {
          id: attemptId,
          orderId,
          stripeCheckoutSessionId: session.id,
        },
        include: { order: true },
      });

      if (!attempt) throw new BadRequestException('Matching payment attempt not found');

      const expectedAmount = this.toMinorUnits(attempt.amount);
      if (
        session.amount_total !== expectedAmount ||
        session.currency?.toLowerCase() !== attempt.currency.toLowerCase() ||
        attempt.order.totalAmount.toString() !== attempt.amount.toString() ||
        attempt.order.currency.toLowerCase() !== attempt.currency.toLowerCase()
      ) {
        throw new BadRequestException('Stripe amount or currency mismatch');
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      // A second successful Checkout Session must be visible for manual review.
      // Never silently discard a late duplicate capture or auto-refund it.
      if (attempt.order.paymentStatus === PaymentStatus.PAID) {
        if (attempt.status !== PaymentAttemptStatus.SUCCEEDED) {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PaymentAttemptStatus.SUCCEEDED,
              paidAt: new Date(),
              stripePaymentIntentId: paymentIntentId ?? undefined,
              requiresManualReview: true,
              reviewReason: 'LATE_DUPLICATE_CAPTURE',
            },
          });
        }
        return;
      }

      const reservation = await tx.stockReservation.findUnique({
        where: { orderId },
      });

      // If an expiry event already released inventory, accept the payment record
      // but stop automatic fulfillment. Admin must resolve stock/refund manually.
      if (
        !reservation ||
        reservation.status !== 'RESERVED' ||
        attempt.order.status === OrderStatus.CANCELLED
      ) {
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: PaymentAttemptStatus.SUCCEEDED,
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntentId ?? undefined,
            requiresManualReview: true,
            reviewReason: 'LATE_PAYMENT_AFTER_RESERVATION_RELEASE',
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
        });
        return;
      }

      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.SUCCEEDED,
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId ?? undefined,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PROCESSING,
          paidAt: new Date(),
        },
      });

      await tx.stockReservation.updateMany({
        where: { orderId, status: 'RESERVED' },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
      await tx.couponRedemption.updateMany({
        where: { orderId, status: 'RESERVED' },
        data: { status: 'REDEEMED', redeemedAt: new Date() },
      });

      // Durable outbox row is committed atomically with payment and reservations.
      // A background worker performs the Apliiq network request after commit.
      await tx.fulfillment.upsert({
        where: { orderId_provider: { orderId, provider: 'APLIIQ' } },
        create: { orderId, provider: 'APLIIQ', submissionStatus: 'QUEUED' },
        update: {},
      });
    });
  }

  async handleCheckoutExpired(session: Stripe.Checkout.Session, eventId: string) {
    const attemptId = session.metadata?.paymentAttemptId;
    const orderId = session.metadata?.orderId;
    if (!attemptId || !orderId) return;

    await this.prisma.$transaction(async (tx) => {
      // Serialize expiry against successful-payment handling for this order.
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      // Claim event ID in the same transaction as side effects; duplicate deliveries do nothing.
      const eventClaim = await tx.stripeWebhookEvent.createMany({
        data: [{ id: eventId, type: 'checkout.session.expired' }],
        skipDuplicates: true,
      });
      if (eventClaim.count === 0) return;

      await tx.paymentAttempt.updateMany({
        where: {
          id: attemptId,
          orderId,
          stripeCheckoutSessionId: session.id,
          status: PaymentAttemptStatus.CREATED,
        },
        data: { status: PaymentAttemptStatus.CANCELLED },
      });

      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { paymentStatus: true, status: true },
      });
      if (!order || order.paymentStatus === PaymentStatus.PAID) return;

      // Do not release stock while another Checkout Session for this order
      // is still open/being created.
      const otherActiveAttempt = await tx.paymentAttempt.findFirst({
        where: {
          orderId,
          status: PaymentAttemptStatus.CREATED,
        },
      });
      if (otherActiveAttempt) return;

      const reservation = await tx.stockReservation.findUnique({
        where: { orderId },
        include: { items: true },
      });

      if (reservation?.status === 'RESERVED') {
        const claimed = await tx.stockReservation.updateMany({
          where: { id: reservation.id, status: 'RESERVED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });

        if (claimed.count === 1) {
          for (const item of reservation.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stockQuantity: { increment: item.quantity } },
              });
            } else {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { increment: item.quantity } },
              });
            }
          }
        }
      }

      const redemption = await tx.couponRedemption.findUnique({
        where: { orderId },
      });
      if (redemption?.status === 'RESERVED') {
        const claimed = await tx.couponRedemption.updateMany({
          where: { id: redemption.id, status: 'RESERVED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
        if (claimed.count === 1) {
          await tx.coupon.update({
            where: { id: redemption.couponId },
            data: { usageCount: { decrement: 1 } },
          });
        }
      }

      await tx.order.updateMany({
        where: { id: orderId, paymentStatus: PaymentStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }
  async resolveManualReview(
    attemptId: string, adminUserId: string, decision: 'REFUND' | 'RESOLVE_NO_REFUND', note: string,
  ) {
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true } });
    if (!attempt) throw new NotFoundException('Payment attempt not found');
    if (!attempt.requiresManualReview) throw new ConflictException('Payment attempt is not awaiting manual review');
    const normalizedNote = note.trim();
    if (normalizedNote.length < 5 || normalizedNote.length > 500) throw new BadRequestException('Resolution note must be between 5 and 500 characters');

    if (decision === 'REFUND') {
      if (!attempt.stripePaymentIntentId) throw new ConflictException('No Stripe PaymentIntent is recorded; refund cannot be automated');
      await this.stripe.refunds.create(
        {
          payment_intent: attempt.stripePaymentIntentId,
          reason: 'requested_by_customer',
          metadata: { orderId: attempt.orderId, paymentAttemptId: attempt.id, reviewedBy: adminUserId, reviewNote: normalizedNote.slice(0, 450) },
        },
        { idempotencyKey: 'manual-review-refund:' + attempt.id },
      );
      const otherSuccessfulAttempts = await this.prisma.paymentAttempt.count({
        where: { orderId: attempt.orderId, id: { not: attempt.id }, status: PaymentAttemptStatus.SUCCEEDED },
      });
      return this.prisma.$transaction(async (tx) => {
        const resolved = await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { requiresManualReview: false, reviewResolvedAt: new Date(), reviewResolvedBy: adminUserId, reviewResolution: 'REFUND: ' + normalizedNote },
        });
        // Refunding a duplicate capture must not cancel the original paid order.
        if (otherSuccessfulAttempts === 0) {
          await tx.order.update({ where: { id: attempt.orderId }, data: { status: OrderStatus.REFUNDED } });
        }
        return resolved;
      });
    }

    return this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { requiresManualReview: false, reviewResolvedAt: new Date(), reviewResolvedBy: adminUserId, reviewResolution: 'NO_REFUND: ' + normalizedNote },
    });
  }

  async findAttemptsForManualReview() {
    return this.prisma.paymentAttempt.findMany({
      where: { requiresManualReview: true },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
            userId: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }


  async createCustomerRefundRequest(userId: string, orderId: string, reason: string) {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 1000) {
      throw new BadRequestException('Refund reason must be between 10 and 1000 characters');
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { paymentAttempts: { where: { status: PaymentAttemptStatus.SUCCEEDED }, orderBy: { paidAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== PaymentStatus.PAID || order.status === OrderStatus.REFUNDED) {
      throw new ConflictException('Only paid, not-yet-refunded orders can request a refund');
    }
    if (!order.paymentAttempts.some((attempt) => attempt.stripePaymentIntentId)) {
      throw new ConflictException('No successful Stripe payment is available for refund');
    }
    const pending = await this.prisma.refundRequest.findFirst({ where: { orderId, status: 'PENDING' } });
    if (pending) throw new ConflictException('A refund request is already pending for this order');
    try {
      return await this.prisma.refundRequest.create({
        data: { orderId, userId, reason: normalizedReason },
        select: { id: true, orderId: true, reason: true, status: true, createdAt: true },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A refund request with this status already exists');
      }
      throw error;
    }
  }

  async findMyRefundRequests(userId: string) {
    return this.prisma.refundRequest.findMany({
      where: { userId },
      include: { order: { select: { id: true, orderNumber: true, totalAmount: true, currency: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRefundRequestsForAdmin(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED') {
    return this.prisma.refundRequest.findMany({
      where: status ? { status } : {},
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true, currency: true, status: true, paymentStatus: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewRefundRequest(requestId: string, adminId: string, decision: 'APPROVE' | 'REJECT', note: string) {
    const normalizedNote = note.trim();
    if (normalizedNote.length < 5 || normalizedNote.length > 500) {
      throw new BadRequestException('Admin note must be between 5 and 500 characters');
    }
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: { order: { include: { paymentAttempts: { where: { status: PaymentAttemptStatus.SUCCEEDED }, orderBy: { paidAt: 'asc' } } } } },
    });
    if (!request) throw new NotFoundException('Refund request not found');
    if (request.status !== 'PENDING') throw new ConflictException('Refund request has already been reviewed');

    if (decision === 'REJECT') {
      const claimed = await this.prisma.refundRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: 'REJECTED', adminNote: normalizedNote, reviewedBy: adminId, reviewedAt: new Date() },
      });
      if (claimed.count !== 1) throw new ConflictException('Refund request was already processed');
      return this.prisma.refundRequest.findUnique({ where: { id: requestId } });
    }

    if (request.order.paymentStatus !== PaymentStatus.PAID || request.order.status === OrderStatus.REFUNDED) {
      throw new ConflictException('Order is no longer eligible for refund');
    }
    const successfulAttempt = request.order.paymentAttempts.find((attempt) => attempt.stripePaymentIntentId);
    if (!successfulAttempt?.stripePaymentIntentId) {
      throw new ConflictException('No successful Stripe PaymentIntent is available');
    }

    let stripeRefundId: string;
    try {
      const stripeRefund = await this.stripe.refunds.create(
        {
          payment_intent: successfulAttempt.stripePaymentIntentId,
          reason: 'requested_by_customer',
          metadata: { refundRequestId: request.id, orderId: request.orderId, reviewedBy: adminId, reviewNote: normalizedNote.slice(0, 450) },
        },
        { idempotencyKey: 'customer-refund-request:' + request.id },
      );
      stripeRefundId = stripeRefund.id;
    } catch {
      // Keep request PENDING; a retry uses the same Stripe idempotency key.
      throw new ServiceUnavailableException('Stripe refund could not be confirmed. The request remains pending for a safe retry.');
    }

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refundRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: 'APPROVED', adminNote: normalizedNote, reviewedBy: adminId, reviewedAt: new Date(), stripeRefundId },
      });
      if (claimed.count !== 1) {
        // Stripe's idempotency key ensures a retry cannot create a second refund.
        throw new ConflictException('Refund was sent to Stripe but the request state changed; reconcile this request before retrying');
      }
      await tx.order.update({ where: { id: request.orderId }, data: { status: OrderStatus.REFUNDED } });
      return tx.refundRequest.findUnique({ where: { id: requestId } });
    });
  }

}
