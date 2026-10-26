import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ApliiqClient } from './apliiq.client';
import { mapOrderToApliiq } from './apliiq.mapper';

type CreateOrderResponse = { id: string | number };

@Injectable()
export class ApliiqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ApliiqClient,
    private readonly config: ConfigService,
  ) {}

  async submitPaidOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, fulfillments: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID') {
      throw new ConflictException('Only paid orders can be submitted to Apliiq');
    }

    const existing = order.fulfillments.find((f) => f.provider === 'APLIIQ');
    if (existing?.externalOrderId) return existing;
    if (existing?.submissionStatus === 'SUBMITTING' ||
        existing?.submissionStatus === 'UNKNOWN') {
      // Reconcile with Apliiq before another POST; never blindly duplicate.
      return existing;
    }

    const fulfillment = existing
      ? await this.prisma.fulfillment.update({
          where: { id: existing.id },
          data: { submissionStatus: 'SUBMITTING', lastErrorCode: null },
        })
      : await this.prisma.fulfillment.create({
          data: {
            orderId: order.id,
            provider: 'APLIIQ',
            submissionStatus: 'SUBMITTING',
          },
        });

    try {
      const payload = mapOrderToApliiq(order as never);
      const response = await this.client.postOrder<CreateOrderResponse>(payload);

      if (response?.id === undefined || response?.id === null) {
        await this.prisma.fulfillment.update({
          where: { id: fulfillment.id },
          data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'MISSING_PROVIDER_ID' },
        });
        return { ...fulfillment, submissionStatus: 'UNKNOWN' };
      }

      return await this.prisma.fulfillment.update({
        where: { id: fulfillment.id },
        data: {
          externalOrderId: String(response.id),
          submissionStatus: 'ACCEPTED',
          submittedAt: new Date(),
          lastErrorCode: null,
        },
      });
    } catch (error) {
      // Timeout/network errors are ambiguous: Apliiq may have accepted the order.
      // Do not auto-submit again until reconciled by provider order lookup/manual review.
      await this.prisma.fulfillment.update({
        where: { id: fulfillment.id },
        data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'SUBMISSION_UNCONFIRMED' },
      });
      throw error;
    }
  }

  async processFulfillmentWebhook(body: unknown) {
  // Validate shape with class-validator/Zod before accessing nested properties.
  // Resolve body.fulfillment.order_id to Fulfillment.externalOrderId.
  // In one DB transaction:
  // 1) deduplicate a stable provider event key or compare the persisted status/payload;
  // 2) update providerStatus, trackingCompany, trackingNumbers, trackingUrls;
  // 3) when status means shipped, set fulfillment.shippedAt and Order.status = SHIPPED;
  // 4) store only the minimum redacted audit data needed for support.
  // Return success for an already-applied duplicate delivery.
}
}
