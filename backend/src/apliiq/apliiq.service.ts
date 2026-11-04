import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ApliiqClient } from './apliiq.client';
import { mapOrderToApliiq } from './apliiq.mapper';

type CreateOrderResponse = { id: string | number };

@Processor('apliiq-fulfillment')
@Injectable()
export class ApliiqService extends WorkerHost implements OnModuleInit {
  private readonly pollIntervalMs = 5_000;
  private readonly staleSubmissionMs = 5 * 60_000;
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ApliiqClient,
    @InjectQueue('apliiq-fulfillment') private readonly queue: Queue,
  ) { super(); }

  async onModuleInit() {
    // Durable DB outbox remains the source of truth; BullMQ schedules workers to drain it.
    await this.queue.add('drain-fulfillment-outbox', {}, {
      jobId: 'apliiq-fulfillment-repeat', repeat: { every: this.pollIntervalMs },
      removeOnComplete: 100, removeOnFail: 500,
    });
    await this.queue.add('drain-fulfillment-outbox', {}, {
      jobId: `apliiq-fulfillment-start-${Date.now()}`, removeOnComplete: true,
    });
  }

  async process(_job: Job): Promise<void> {
    await this.pollFulfillmentQueue();
  }

  async uploadArtwork(payload: { Name: string; ImagePath: string }) {
    if (!payload.Name?.trim() || !/^https:\/\//i.test(payload.ImagePath)) {
      throw new BadRequestException('Artwork Name and a public HTTPS ImagePath are required');
    }
    const result = await this.client.postArtwork<Record<string, unknown>>({
      Name: payload.Name.trim(),
      ImagePath: payload.ImagePath,
    });
    const id = result.Id ?? result.id;
    if (id === undefined || id === null) {
      throw new ConflictException('Apliiq Artwork response did not include an artwork ID');
    }
    return { id: String(id), provider: result };
  }

  async createProductDesign(productId: string, payload: Record<string, unknown>) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { isActive: true }, include: { size: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.variants.length) {
      throw new BadRequestException('Create active size variants before creating an Apliiq design');
    }
    const productCode = payload.ProductCode;
    const colorId = payload.ColorId;
    const artworks = payload.Artworks;
    if (typeof productCode !== 'string' || !productCode.trim() ||
        (typeof colorId !== 'string' && typeof colorId !== 'number') ||
        !Array.isArray(artworks) || artworks.length === 0 ||
        !Array.isArray(payload.Locations) || payload.Locations.length === 0) {
      throw new BadRequestException('ProductCode, ColorId, Locations and at least one Artwork are required');
    }
    const response = await this.client.postDesign<Record<string, unknown>>({
      ProductCode: productCode,
      ...(payload.ProductId !== undefined ? { ProductId: payload.ProductId } : {}),
      ColorId: colorId,
      Locations: payload.Locations,
      ...(payload.MockupTemplateId !== undefined ? { MockupTemplateId: payload.MockupTemplateId } : {}),
      Artworks: artworks,
    });
    const designId = response.Id ?? response.id;
    if (designId === undefined || designId === null) {
      throw new ConflictException('Apliiq Design response did not include a design ID');
    }
    const providerVariants = Array.isArray(response.Variants) ? response.Variants as Array<Record<string, unknown>> : [];
    if (!providerVariants.length && !this.client.isMockMode) {
      throw new ConflictException('Apliiq Design response did not include sellable size variants');
    }

    const skuBySize = new Map<string, string>();
    for (const item of providerVariants) {
      const sizeName = typeof item.Name === 'string' ? item.Name.trim().toLowerCase() : '';
      const sku = typeof item.SKU === 'string' ? item.SKU.trim() : '';
      if (sizeName && sku) skuBySize.set(sizeName, sku);
    }
    const unmatched: string[] = [];
    for (const variant of product.variants) {
      const key = variant.size.label.trim().toLowerCase();
      const providerSku = skuBySize.get(key);
      if (providerSku) {
        await this.prisma.productVariant.update({
          where: { id: variant.id },
          data: { apliiqVariantSku: providerSku },
        });
      } else if (this.client.isMockMode) {
        await this.prisma.productVariant.update({
          where: { id: variant.id },
          data: { apliiqVariantSku: `MOCK-${String(designId)}-${variant.size.normalizedKey}` },
        });
      } else {
        unmatched.push(variant.size.label);
      }
    }
    if (unmatched.length) {
      throw new ConflictException(`Apliiq returned no SKU for local size(s): ${unmatched.join(', ')}. No order should be placed until variants are mapped.`);
    }
    await this.prisma.product.update({
      where: { id: productId },
      data: { apliiqDesignId: String(designId) },
    });
    return {
      productId,
      apliiqDesignId: String(designId),
      variants: await this.prisma.productVariant.findMany({
        where: { productId, isActive: true },
        include: { size: true },
        orderBy: { size: { sortOrder: 'asc' } },
      }),
      mock: this.client.isMockMode,
    };
  }

  async submitPaidOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { fulfillments: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID') throw new ConflictException('Only paid orders can be submitted to Apliiq');
    const existing = order.fulfillments.find((item) => item.provider === 'APLIIQ');
    if (existing) return existing;
    const fulfillment = await this.prisma.fulfillment.create({ data: { orderId: order.id, provider: 'APLIIQ', submissionStatus: 'QUEUED' } });
    await this.queue.add('drain-fulfillment-outbox', {}, { removeOnComplete: true });
    return fulfillment;
  }

  private async pollFulfillmentQueue() {
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
    }
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
