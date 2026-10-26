import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!key || !webhookSecret) {
      throw new Error('Stripe key and webhook secret are required');
    }
    this.stripe = new Stripe(key);
    this.webhookSecret = webhookSecret;
  }

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Stripe signature');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.payments.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
        break;
      case 'checkout.session.expired':
        await this.payments.handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
        break;
      default:
        // Acknowledge unrelated event types so Stripe does not retry forever.
        break;
    }

    return { received: true };
  }
}
