import {
  Controller, Headers, HttpCode, Post, Req, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ApliiqService } from './apliiq.service';

@Controller('webhooks/apliiq')
export class ApliiqWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly apliiq: ApliiqService,
  ) {}

  @Post('fulfillment')
  @HttpCode(200)
  async fulfillment(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-apliiq-hmac') signature?: string,
    @Headers('x-apliiq-webhook-token') token?: string,
  ) {
    const expectedToken = this.config.get<string>('APLIIQ_FULFILLMENT_WEBHOOK_TOKEN');
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    if (!req.rawBody || !signature) {
      throw new UnauthorizedException('Missing webhook body or signature');
    }

    // Confirm the exact encoding against Apliiq's current webhook docs:
    // documented algorithm signs the Base64-encoded payload with Shared Secret.
    const payloadBase64 = req.rawBody.toString('base64');
    const expected = createHmac(
      'sha256',
      this.config.getOrThrow<string>('APLIIQ_SHARED_SECRET'),
    ).update(payloadBase64, 'utf8').digest('base64');

    const suppliedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid Apliiq webhook signature');
    }

    const body = JSON.parse(req.rawBody.toString('utf8'));
    await this.apliiq.processFulfillmentWebhook(body);
    return { received: true };
  }
}
