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
import { NotificationsService } from '../notifications/notifications.service';

// Keep a one-minute buffer above Stripe's 30-minute minimum expiry.
const CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly notifications: NotificationsService,
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
      include: { items: true, stockReservation: { select: { status: true, expiresAt: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }
    if (!order.stockReservation || order.stockReservation.status !== 'RESERVED' || order.stockReservation.expiresAt <= new Date()) {
      throw new ConflictException('The stock reservation has expired. Create a new order to continue.');
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
        if (currentSession.expires_at) {
          const existingExpiry = new Date(currentSession.expires_at * 1000);
          await this.prisma.$transaction([
            this.prisma.paymentAttempt.updateMany({
              where: { id: currentAttempt.id, status: PaymentAttemptStatus.CREATED },
              data: { checkoutExpiresAt: existingExpiry },
            }),
            this.prisma.stockReservation.updateMany({
              where: { orderId: order.id, status: 'RESERVED' },
              data: { expiresAt: existingExpiry },
            }),
          ]);
        }
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
    const checkoutExpiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_SECONDS * 1000);
    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${order.id} FOR UPDATE`;
      const reservation = await tx.stockReservation.findUnique({ where: { orderId: order.id } });
      if (!reservation || reservation.status !== 'RESERVED') {
        throw new ConflictException('The stock reservation has expired. Create a new order to continue.');
      }
      if (reservation.expiresAt <= new Date()) throw new ConflictException('The stock reservation has expired. Create a new order to continue.');
      const active = await tx.paymentAttempt.findFirst({
        where: { orderId: order.id, status: PaymentAttemptStatus.CREATED },
        orderBy: { createdAt: 'desc' },
      });
      if (active) {
        const stableExpiry = active.checkoutExpiresAt ?? checkoutExpiresAt;
        if (!active.checkoutExpiresAt) {
          await tx.paymentAttempt.update({ where: { id: active.id }, data: { checkoutExpiresAt: stableExpiry } });
        }
        const extended = await tx.stockReservation.updateMany({
          where: { id: reservation.id, status: 'RESERVED', expiresAt: { gt: new Date() } },
          data: { expiresAt: stableExpiry },
        });
        if (extended.count !== 1) throw new ConflictException('Stock reservation expired while starting payment');
        return { ...active, checkoutExpiresAt: stableExpiry };
      }

      const extended = await tx.stockReservation.updateMany({
        where: { id: reservation.id, status: 'RESERVED', expiresAt: { gt: new Date() } },
        data: { expiresAt: checkoutExpiresAt },
      });
      if (extended.count !== 1) throw new ConflictException('Stock reservation expired while starting payment');
      return tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          provider: 'STRIPE',
          status: PaymentAttemptStatus.CREATED,
          amount: order.totalAmount,
          currency: order.currency.toLowerCase(),
          checkoutExpiresAt,
        },
      });
    });

    const sessionExpiresAt = attempt.checkoutExpiresAt ?? checkoutExpiresAt;
    try {
      const amount = this.toMinorUnits(order.totalAmount);
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          payment_method_types: ['card'],
          expires_at: Math.floor(sessionExpiresAt.getTime() / 1000),
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

  async expireCheckoutSessionsForOrder(orderId: string): Promise<void> {
    const attempts = await this.prisma.paymentAttempt.findMany({
      where: { orderId, status: PaymentAttemptStatus.CREATED, stripeCheckoutSessionId: { not: null } },
      select: { id: true, stripeCheckoutSessionId: true },
    });
    for (const attempt of attempts) {
      if (!attempt.stripeCheckoutSessionId) continue;
      let session: Stripe.Checkout.Session;
      try {
        session = await this.stripe.checkout.sessions.retrieve(attempt.stripeCheckoutSessionId);
      } catch {
        throw new ServiceUnavailableException('Could not verify the current Stripe session; order was not cancelled.');
      }
      if (session.status === 'complete') {
        throw new ConflictException('Payment has already completed or is processing; the order cannot be cancelled.');
      }
      if (session.status === 'open') {
        try {
          await this.stripe.checkout.sessions.expire(session.id);
        } catch {
          throw new ServiceUnavailableException('Could not expire the Stripe Checkout Session; order was not cancelled.');
        }
      }
      await this.prisma.paymentAttempt.updateMany({
        where: { id: attempt.id, status: PaymentAttemptStatus.CREATED },
        data: { status: PaymentAttemptStatus.CANCELLED },
      });
    }
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
    const orderId = session.metadata?.orderId;
    const attemptId = session.metadata?.paymentAttemptId;

    if (!orderId || !attemptId || session.payment_status !== 'paid') {
      throw new BadRequestException('Checkout session is not a paid, linked session');
    }

    let confirmation: { email: string; orderNumber: string; customerName?: string | null; totalAmount: string; currency: string } | null = null;
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
        confirmation = { email: attempt.order.customerEmail, orderNumber: attempt.order.orderNumber, customerName: attempt.order.customerName, totalAmount: attempt.amount.toString(), currency: attempt.currency };
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
        confirmation = { email: attempt.order.customerEmail, orderNumber: attempt.order.orderNumber, customerName: attempt.order.customerName, totalAmount: attempt.amount.toString(), currency: attempt.currency };
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
      confirmation = { email: attempt.order.customerEmail, orderNumber: attempt.order.orderNumber, customerName: attempt.order.customerName, totalAmount: attempt.amount.toString(), currency: attempt.currency };
    });
    if (confirmation) await this.notifications.orderConfirmed(confirmation);
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

}
