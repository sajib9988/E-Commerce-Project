import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApliiqClient } from './apliiq.client';
import { mapOrderToApliiq } from './apliiq.mapper';

type CreateOrderResponse = { id: string | number };

@Injectable()
export class ApliiqService implements OnModuleInit, OnModuleDestroy {
  private pollTimer?: NodeJS.Timeout;
  private polling = false;
  private readonly pollIntervalMs = 5_000;
  private readonly staleSubmissionMs = 5 * 60_000;
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ApliiqClient,
  ) {}

  onModuleInit() {
    // Fulfillment rows are a durable outbox; provider I/O runs after the payment transaction commits.
    this.pollTimer = setInterval(() => { void this.pollFulfillmentQueue().catch(() => undefined); }, this.pollIntervalMs);
    this.pollTimer.unref?.();
    void this.pollFulfillmentQueue().catch(() => undefined);
  }

  onModuleDestroy() { if (this.pollTimer) clearInterval(this.pollTimer); }

  async submitPaidOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { fulfillments: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID') throw new ConflictException('Only paid orders can be submitted to Apliiq');
    const existing = order.fulfillments.find((item) => item.provider === 'APLIIQ');
    if (existing) return existing;
    return this.prisma.fulfillment.create({ data: { orderId: order.id, provider: 'APLIIQ', submissionStatus: 'QUEUED' } });
  }

  private async pollFulfillmentQueue() {
    if (this.polling) return;
    this.polling = true;
    try {
      const staleBefore = new Date(Date.now() - this.staleSubmissionMs);
      await this.prisma.fulfillment.updateMany({
        where: { provider: 'APLIIQ', submissionStatus: 'SUBMITTING', updatedAt: { lt: staleBefore } },
        data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'WORKER_STALE_REQUIRES_RECONCILIATION' },
      });
      const queued = await this.prisma.fulfillment.findMany({
        where: { provider: 'APLIIQ', submissionStatus: 'QUEUED' },
        select: { id: true, orderId: true }, orderBy: { createdAt: 'asc' }, take: 5,
      });
      for (const item of queued) {
        const claimed = await this.prisma.fulfillment.updateMany({
          where: { id: item.id, submissionStatus: 'QUEUED' },
          data: { submissionStatus: 'SUBMITTING', lastErrorCode: null },
        });
        if (claimed.count === 1) await this.submitClaimedFulfillment(item.id, item.orderId);
      }
    } finally { this.polling = false; }
  }

  private async submitClaimedFulfillment(fulfillmentId: string, orderId: string) {
    try {
      const [fulfillment, order] = await Promise.all([
        this.prisma.fulfillment.findUnique({ where: { id: fulfillmentId } }),
        this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }),
      ]);
      if (!fulfillment || fulfillment.submissionStatus !== 'SUBMITTING') return;
      if (!order || order.paymentStatus !== 'PAID') {
        await this.prisma.fulfillment.update({ where: { id: fulfillmentId }, data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'ORDER_NOT_PAID_OR_MISSING' } });
        return;
      }
      const payload = mapOrderToApliiq(order as never);
      const response = await this.client.postOrder<CreateOrderResponse>(payload);
      if (response?.id === undefined || response?.id === null) {
        await this.prisma.fulfillment.update({ where: { id: fulfillmentId }, data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'MISSING_PROVIDER_ID' } });
        return;
      }
      await this.prisma.fulfillment.update({
        where: { id: fulfillmentId },
        data: { externalOrderId: String(response.id), submissionStatus: 'ACCEPTED', submittedAt: new Date(), lastErrorCode: null },
      });
    } catch {
      // An ambiguous timeout may mean the provider accepted the order. Never blindly retry UNKNOWN.
      await this.prisma.fulfillment.update({ where: { id: fulfillmentId }, data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'SUBMISSION_UNCONFIRMED' } }).catch(() => undefined);
    }
  }

  async processFulfillmentWebhook(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid Apliiq fulfillment payload');
    }

    const root = body as Record<string, unknown>;
    const rawFulfillment = root.fulfillment;
    if (
      !rawFulfillment ||
      typeof rawFulfillment !== 'object' ||
      Array.isArray(rawFulfillment)
    ) {
      throw new BadRequestException('Missing Apliiq fulfillment object');
    }

    const payload = rawFulfillment as Record<string, unknown>;
    const rawOrderId = payload.order_id;
    const externalOrderId =
      typeof rawOrderId === 'string' || typeof rawOrderId === 'number'
        ? String(rawOrderId).trim()
        : '';
    const providerStatus =
      typeof payload.status === 'string' ? payload.status.trim() : '';

    if (!externalOrderId || externalOrderId.length > 200 || !providerStatus || providerStatus.length > 100) {
      throw new BadRequestException('Apliiq fulfillment order_id/status is invalid');
    }

    const readStringArray = (key: string): string[] | undefined => {
      const value = payload[key];
      if (value === undefined || value === null) return undefined;
      if (!Array.isArray(value) || value.length > 50) {
        throw new BadRequestException(`Apliiq ${key} must be an array of strings`);
      }
      return value.map((entry) => {
        if (typeof entry !== 'string' || entry.length > 1000) {
          throw new BadRequestException(`Apliiq ${key} contains an invalid value`);
        }
        return entry.trim();
      });
    };

    const trackingCompany =
      payload.tracking_company === undefined || payload.tracking_company === null
        ? undefined
        : typeof payload.tracking_company === 'string'
          ? payload.tracking_company.trim().slice(0, 200)
          : (() => { throw new BadRequestException('Invalid tracking_company'); })();
    const trackingNumbers = readStringArray('tracking_numbers');
    const trackingUrls = readStringArray('tracking_urls');
    const isShipped = ['success', 'shipped'].includes(providerStatus.toLowerCase());

    return this.prisma.$transaction(async (tx) => {
      const fulfillment = await tx.fulfillment.findUnique({
        where: { externalOrderId },
        include: { order: true },
      });

      if (!fulfillment) {
        throw new NotFoundException('No local fulfillment matches the Apliiq order ID');
      }

      const updateData: {
        providerStatus: string;
        trackingCompany?: string | null;
        trackingNumbers?: string[];
        trackingUrls?: string[];
        shippedAt?: Date;
      } = { providerStatus };

      if (trackingCompany !== undefined) updateData.trackingCompany = trackingCompany;
      if (trackingNumbers !== undefined) updateData.trackingNumbers = trackingNumbers;
      if (trackingUrls !== undefined) updateData.trackingUrls = trackingUrls;
      if (isShipped && !fulfillment.shippedAt) updateData.shippedAt = new Date();

      // Repeated webhook deliveries are safe: applying the same values again
      // does not create duplicate records or notify the customer twice.
      const updated = await tx.fulfillment.update({
        where: { id: fulfillment.id },
        data: updateData,
      });

      // Apliiq's documented "success" payload is a shipment/tracking notification,
      // not proof that the carrier delivered the package. Never mark DELIVERED here.
      const terminalLocalStatuses = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (
        isShipped &&
        !terminalLocalStatuses.includes(String(fulfillment.order.status))
      ) {
        await tx.order.update({
          where: { id: fulfillment.orderId },
          data: { status: 'SHIPPED' },
        });
      }

      return updated;
    });
  }
}
