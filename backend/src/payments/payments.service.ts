import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentAttemptStatus, PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApliiqService } from '../apliiq/apliiq.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apliiq: ApliiqService,
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

    const attempt = await this.prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: 'STRIPE',
        status: PaymentAttemptStatus.CREATED,
        amount: order.totalAmount,
        currency: order.currency.toLowerCase(),
      },
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
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: PaymentAttemptStatus.FAILED },
      });
      throw new ServiceUnavailableException(
        'Could not start Stripe Checkout. Please retry.',
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
      // Insert once, but let Stripe retries continue through idempotent state checks.
      // If the transaction fails, this insert rolls back with the transaction.
      await tx.stripeWebhookEvent.createMany({
        data: [{ id: eventId, type: 'checkout.session.completed' }],
        skipDuplicates: true,
      });

      const attempt = await tx.paymentAttempt.findFirst({
        where: {
          id: attemptId,
          orderId,
          stripeCheckoutSessionId: session.id,
        },
        include: { order: true },
      });

      if (!attempt) throw new Error('Matching payment attempt not found');

      const expectedAmount = this.toMinorUnits(attempt.amount);
      if (
        session.amount_total !== expectedAmount ||
        session.currency?.toLowerCase() !== attempt.currency.toLowerCase() ||
        attempt.order.totalAmount.toString() !== attempt.amount.toString() ||
        attempt.order.currency.toLowerCase() !== attempt.currency.toLowerCase()
      ) {
        throw new Error('Stripe amount or currency mismatch');
      }

      // A different, late session must not change an already-paid order.
      if (attempt.order.paymentStatus === PaymentStatus.PAID) {
        return;
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

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
    });

    // Run only after the verified payment transaction has committed.
    // submitPaidOrder checks PAID state and persists a provider submission record.
    // Stripe retries can safely reach this point again; Apliiq submission must
    // never be blindly repeated after an ambiguous network timeout.
    await this.apliiq.submitPaidOrder(orderId);
  }

  async handleCheckoutExpired(session: Stripe.Checkout.Session, eventId: string) {
    const attemptId = session.metadata?.paymentAttemptId;
    if (!attemptId) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({
        data: { id: eventId, type: 'checkout.session.expired' },
      });
      await tx.paymentAttempt.updateMany({
        where: {
          id: attemptId,
          stripeCheckoutSessionId: session.id,
          status: PaymentAttemptStatus.CREATED,
        },
        data: { status: PaymentAttemptStatus.CANCELLED },
      });
    });
  }
}
