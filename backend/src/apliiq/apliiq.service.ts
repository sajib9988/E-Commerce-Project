import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApliiqClient } from './apliiq.client';
import { mapOrderToApliiq } from './apliiq.mapper';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';

type CreateOrderResponse = { id: string | number };

@Processor('apliiq-fulfillment')
@Injectable()
export class ApliiqService extends WorkerHost implements OnModuleInit {
  private readonly pollIntervalMs = 5_000;
  private readonly staleSubmissionMs = 5 * 60_000;
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ApliiqClient,
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsService,
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


  async createProductArtwork(productId: string, name: string, file: Express.Multer.File) {
    if (typeof name !== 'string' || !name.trim()) throw new BadRequestException('Artwork name is required');
    const artworkName = name.trim().slice(0, 50);
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (!file?.buffer) throw new BadRequestException('A print-ready artwork image file is required');
    const uploaded = await this.cloudinary.uploadImage(file, 'ecommerce/artworks');

    let provider: Record<string, unknown>;
    try {
      provider = await this.client.postArtwork<Record<string, unknown>>({
        Name: artworkName,
        ImagePath: uploaded.secure_url,
      });
    } catch (error) {
      await this.cloudinary.deleteImage(uploaded.public_id).catch(() => undefined);
      throw error;
    }

    const rawId = provider.Id ?? provider.id;
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      // Keep the Cloudinary asset: Apliiq may have accepted the request even if its response was incomplete.
      throw new ConflictException('Apliiq Artwork response did not include an artwork ID; reconcile this upload before retrying');
    }
    return this.prisma.productArtwork.create({
      data: {
        productId, name: artworkName, imageUrl: uploaded.secure_url,
        imagePublicId: uploaded.public_id, apliiqArtworkId: String(rawId),
        isPrimary: (await this.prisma.productArtwork.count({ where: { productId } })) === 0,
      },
      include: { placements: true },
    });
  }

  async registerProductImageAsArtwork(productId: string, name?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    let parsed: URL;
    try { parsed = new URL(product.imageUrl); } catch {
      throw new BadRequestException('Product image must be a public HTTPS URL');
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') {
      throw new BadRequestException('Product image must be hosted on Cloudinary over HTTPS');
    }
    const existing = await this.prisma.productArtwork.findFirst({
      where: { productId, imageUrl: product.imageUrl }, include: { placements: true },
    });
    if (existing) return { ...existing, reused: true };
    const provider = await this.client.postArtwork<Record<string, unknown>>({
      Name: (name?.trim() || product.name).slice(0, 50), ImagePath: product.imageUrl,
    });
    const rawId = provider.Id ?? provider.id;
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      throw new ConflictException('Apliiq Artwork response did not include an artwork ID');
    }
    return this.prisma.productArtwork.create({
      data: {
        productId, name: (name?.trim() || product.name).slice(0, 50), imageUrl: product.imageUrl,
        imagePublicId: product.imagePublicId, apliiqArtworkId: String(rawId),
        isPrimary: (await this.prisma.productArtwork.count({ where: { productId } })) === 0,
      },
      include: { placements: true },
    });
  }

  async addArtworkPlacement(artworkId: string, payload: {
    locationId: string; service: string; printColors?: string; boxId?: number; note?: string;
    widthInches?: number; heightInches?: number;
  }) {
    const artwork = await this.prisma.productArtwork.findUnique({ where: { id: artworkId }, select: { id: true } });
    if (!artwork) throw new NotFoundException('Product artwork not found');
    const allowedServices = ['print', 'applique', 'dtgprint', 'sublimation', 'embroidery', 'transfer_print'];
    if (!payload.locationId?.trim() || !allowedServices.includes(payload.service?.trim())) {
      throw new BadRequestException('A valid Apliiq locationId and supported decoration service are required');
    }
    if (['print', 'embroidery'].includes(payload.service.trim())) {
      const colors = (payload.printColors ?? '').split(',').map((color) => color.trim()).filter(Boolean);
      if (colors.length < 1 || colors.length > 6 || colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
        throw new BadRequestException('Screen print and embroidery require 1–6 comma-separated hex colors');
      }
    }
    if (payload.boxId !== undefined && (!Number.isInteger(payload.boxId) || payload.boxId < 1)) {
      throw new BadRequestException('boxId must be a positive integer');
    }
    if ([payload.widthInches, payload.heightInches].some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0))) {
      throw new BadRequestException('Artwork physical dimensions must be positive numbers');
    }
    return this.prisma.productArtworkPlacement.create({
      data: {
        artworkId, locationId: payload.locationId.trim(), service: payload.service.trim(),
        ...(payload.printColors !== undefined ? { printColors: payload.printColors } : {}),
        ...(payload.boxId !== undefined ? { boxId: payload.boxId } : {}),
        ...(payload.note !== undefined ? { note: payload.note } : {}),
        ...(payload.widthInches !== undefined ? { widthInches: payload.widthInches } : {}),
        ...(payload.heightInches !== undefined ? { heightInches: payload.heightInches } : {}),
      },
    });
  }

  async createProductDesign(productId: string, payload: Record<string, unknown>) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { isActive: true, apliiqColorId: String(payload.ColorId) }, include: { size: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.variants.length) {
      throw new BadRequestException('Create active size variants for this Apliiq color before creating its design');
    }
    const productCode = payload.ProductCode;
    const colorId = payload.ColorId;
    const placementSpecs = payload.Placements;
    if (typeof productCode !== 'string' || !productCode.trim() ||
        (typeof colorId !== 'string' && typeof colorId !== 'number') ||
        !Array.isArray(placementSpecs) || placementSpecs.length === 0 ||
        !Array.isArray(payload.Locations) || payload.Locations.length === 0) {
      throw new BadRequestException('ProductCode, ColorId, Locations and saved Placements are required');
    }
    const placementIds = [...new Set(placementSpecs.map((spec: any) => spec?.placementId).filter((id: unknown): id is string => typeof id === 'string'))];
    if (placementIds.length !== placementSpecs.length || placementIds.length === 0) {
      throw new BadRequestException('Each design placement must reference a saved placementId');
    }
    const savedPlacements = await this.prisma.productArtworkPlacement.findMany({
      where: { id: { in: placementIds }, artwork: { is: { productId, apliiqArtworkId: { not: null } } } },
      include: { artwork: true },
    });
    if (savedPlacements.length !== placementIds.length) {
      throw new BadRequestException('One or more saved artwork placements are missing or not registered with Apliiq');
    }
    const locationSpecs = payload.Locations as Array<Record<string, unknown>>;
    const locationById = new Map<string, Record<string, unknown>>();
    for (const location of locationSpecs) {
      const rawId = location?.Id;
      const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : '';
      const imagePath = typeof location?.ImagePath === 'string' ? location.ImagePath : '';
      if (!id || !/^https:\/\//i.test(imagePath)) {
        throw new BadRequestException('Each Apliiq location requires its catalog Id and a public HTTPS mockup ImagePath');
      }
      locationById.set(id, location);
    }
    for (const placement of savedPlacements) {
      if (!locationById.has(placement.locationId)) {
        throw new BadRequestException(`Apliiq location ${placement.locationId} is missing from Locations`);
      }
    }
    const locations = [...locationById.entries()].map(([locationId, location]) => ({
      Id: location.Id,
      ImagePath: location.ImagePath,
      Artworks: savedPlacements.filter((placement) => placement.locationId === locationId).map((placement) => {
        if (!placement.artwork.apliiqArtworkId) throw new BadRequestException('Artwork placement is not linked to an Apliiq Artwork');
        return {
          Id: placement.artwork.apliiqArtworkId,
          Service: placement.service,
          ...(placement.printColors ? { PrintColors: placement.printColors } : {}),
          ...(placement.note ? { Note: placement.note } : {}),
          ...(placement.boxId !== null ? { BoxId: placement.boxId } : {}),
        };
      }),
    })).filter((location) => location.Artworks.length > 0);
    const response = await this.client.postDesign<Record<string, unknown>>({
      ProductCode: productCode,
      ...(payload.ProductId !== undefined ? { ProductId: payload.ProductId } : {}),
      ColorId: colorId,
      Locations: locations,
      ...(payload.MockupTemplateId !== undefined ? { MockupTemplateId: payload.MockupTemplateId } : {}),
    });
    const designId = response.Id ?? response.id;
    if (designId === undefined || designId === null) {
      throw new ConflictException('Apliiq Design response did not include a design ID');
    }
    const responseLocations = Array.isArray(response.Locations) ? response.Locations as Array<Record<string, unknown>> : [];
    const mockupUrls = [...new Set(responseLocations
      .map((location) => location.ImagePath)
      .filter((url): url is string => typeof url === 'string')
      .map((url) => url.startsWith('//') ? `https:${url}` : url)
      .filter((url) => /^https:\/\//i.test(url)))];
    const mockupUrl = mockupUrls[0] ?? null;
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
    const skuUpdates: Array<{ id: string; sku: string; designId: string }> = [];
    const unmatched: string[] = [];
    for (const variant of product.variants) {
      const key = variant.size.label.trim().toLowerCase();
      const providerSku = skuBySize.get(key);
      if (providerSku) {
        skuUpdates.push({ id: variant.id, sku: providerSku, designId: String(designId) });
      } else if (this.client.isMockMode) {
        skuUpdates.push({
          id: variant.id,
          sku: `MOCK-${String(designId)}-${variant.size.normalizedKey}`,
          designId: String(designId),
        });
      } else {
        unmatched.push(variant.size.label);
      }
    }
    if (unmatched.length) {
      throw new ConflictException(`Apliiq returned no SKU for local size(s): ${unmatched.join(', ')}. No order should be placed until variants are mapped.`);
    }
    await this.prisma.$transaction([
      this.prisma.apliiqProductDesign.upsert({
        where: { productId_colorId: { productId, colorId: String(colorId) } },
        create: {
          productId, colorId: String(colorId), productCode, apliiqDesignId: String(designId),
          mockupUrl, mockupUrls, providerPayload: response as any,
        },
        update: {
          productCode, apliiqDesignId: String(designId), mockupUrl, mockupUrls,
          providerPayload: response as any,
        },
      }),
      ...skuUpdates.map((item) => this.prisma.productVariant.update({
        where: { id: item.id },
        data: { apliiqVariantSku: item.sku, apliiqDesignId: item.designId },
      })),
    ]);
    return {
      productId,
      apliiqDesignId: String(designId),
      variants: await this.prisma.productVariant.findMany({
        where: { productId, isActive: true, apliiqColorId: String(colorId) },
        include: { size: true },
        orderBy: { size: { sortOrder: 'asc' } },
      }),
      mockupUrl,
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
    } catch (error) {
      // Let BullMQ record/retry transient database failures; provider submission
      // ambiguity is handled separately as UNKNOWN in submitClaimedFulfillment.
      throw error;
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
      const externalOrderId = String(response.id);
      const accepted = await this.prisma.fulfillment.updateMany({
        where: { id: fulfillmentId, submissionStatus: 'SUBMITTING' },
        data: {
          externalOrderId,
          submissionStatus: 'ACCEPTED',
          submittedAt: new Date(),
          lastErrorCode: null,
        },
      });
      if (accepted.count === 0) {
        // A Stripe refund may have arrived while the provider request was in
        // flight. Preserve the cancellation-required state but save the
        // provider ID so an admin can reconcile/cancel it safely.
        await this.prisma.fulfillment.updateMany({
          where: { id: fulfillmentId, submissionStatus: 'CANCELLATION_REQUIRED' },
          data: {
            externalOrderId,
            submittedAt: new Date(),
            lastErrorCode: 'MANUAL_APLIIQ_DASHBOARD_CANCELLATION_AND_RECONCILIATION_REQUIRED',
          },
        });
      }
    } catch {
      // An ambiguous timeout may mean the provider accepted the order. Never
      // overwrite a concurrent refund's CANCELLATION_REQUIRED state.
      await this.prisma.fulfillment.updateMany({
        where: { id: fulfillmentId, submissionStatus: 'SUBMITTING' },
        data: { submissionStatus: 'UNKNOWN', lastErrorCode: 'SUBMISSION_UNCONFIRMED' },
      }).catch(() => undefined);
    }
  }

  async reconcileOrder(orderId: string) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { orderId_provider: { orderId, provider: 'APLIIQ' } },
      include: { order: true },
    });
    if (!fulfillment) throw new NotFoundException('Apliiq fulfillment record not found');
    let externalOrderId = fulfillment.externalOrderId;
    if (!externalOrderId) {
      // Apliiq's order-list endpoint exposes StoreSystemOrderId, which is the
      // local order.id sent in our create-order payload. Use it to reconcile a
      // timeout where Apliiq accepted the POST but our worker never saved OrderId.
      const recentOrders = await this.client.getRecentOrders<unknown>();
      if (!Array.isArray(recentOrders)) {
        throw new ConflictException('Apliiq Get Orders returned an unexpected response');
      }
      const match = recentOrders.find((entry) =>
        entry && typeof entry === 'object' &&
        String((entry as Record<string, unknown>).StoreSystemOrderId ?? '') === orderId,
      ) as Record<string, unknown> | undefined;
      const providerId = match?.OrderId;
      if (providerId === undefined || providerId === null) {
        throw new ConflictException('Apliiq order is not present in the recent order list. Check the Apliiq dashboard; inventory must not be restored yet.');
      }
      externalOrderId = String(providerId);
      await this.prisma.fulfillment.updateMany({
        where: { id: fulfillment.id, externalOrderId: null },
        data: {
          externalOrderId,
          submittedAt: fulfillment.submittedAt ?? new Date(),
          submissionStatus: fulfillment.submissionStatus === 'CANCELLATION_REQUIRED'
            ? 'CANCELLATION_REQUIRED'
            : 'ACCEPTED',
          lastErrorCode: fulfillment.submissionStatus === 'CANCELLATION_REQUIRED'
            ? 'MANUAL_APLIIQ_DASHBOARD_CANCELLATION_AND_RECONCILIATION_REQUIRED'
            : null,
        },
      });
    }

    const raw = await this.client.getOrder<unknown>(externalOrderId);
    const providerOrder = Array.isArray(raw) ? raw[0] : raw;
    if (!providerOrder || typeof providerOrder !== 'object' || Array.isArray(providerOrder)) {
      throw new ConflictException('Apliiq Get Order returned an unexpected response');
    }

    const data = providerOrder as Record<string, unknown>;
    const providerStatus = typeof data.Status === 'string' ? data.Status.trim() : '';
    if (!providerStatus) throw new ConflictException('Apliiq Get Order response has no Status');
    const normalizedStatus = providerStatus.toLowerCase();
    const isCancelled = ['cancelled', 'canceled'].includes(normalizedStatus);
    const isShipped = normalizedStatus === 'shipped';

    const shipNotices = Array.isArray(data.SN) ? data.SN : [];
    const trackingNumbers = shipNotices
      .map((notice) => notice && typeof notice === 'object' ? (notice as Record<string, unknown>).TrackingNumber : null)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const trackingUrls = shipNotices
      .map((notice) => notice && typeof notice === 'object' ? (notice as Record<string, unknown>).Carrier : null)
      .filter((value): value is string => typeof value === 'string' && /^https:\/\//i.test(value));
    const trackingCompany = shipNotices
      .map((notice) => notice && typeof notice === 'object' ? (notice as Record<string, unknown>).Service : null)
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const current = await tx.fulfillment.findUnique({
        where: { id: fulfillment.id },
        include: { order: true },
      });
      if (!current) throw new NotFoundException('Apliiq fulfillment record disappeared');

      const updated = await tx.fulfillment.update({
        where: { id: current.id },
        data: {
          providerStatus,
          submissionStatus: isCancelled ? 'CANCELLED' : current.submissionStatus,
          trackingNumbers,
          trackingUrls,
          ...(trackingCompany ? { trackingCompany } : {}),
          ...(isShipped && !current.shippedAt ? { shippedAt: new Date() } : {}),
          ...(isCancelled ? { lastErrorCode: null } : {}),
        },
      });

      let inventoryRestocked = false;
      if (isCancelled && current.order.paymentStatus === 'REFUNDED') {
        const reservation = await tx.stockReservation.findUnique({
          where: { orderId },
          include: { items: true },
        });
        if (reservation && reservation.status === 'COMMITTED' && !reservation.restockedAt) {
          const claimed = await tx.stockReservation.updateMany({
            where: { id: reservation.id, status: 'COMMITTED', restockedAt: null },
            data: { restockedAt: new Date() },
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
            inventoryRestocked = true;
          }
        }
      }

      if (isShipped && current.order.status !== 'REFUNDED' && current.order.status !== 'CANCELLED') {
        await tx.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } });
      }

      return { fulfillment: updated, inventoryRestocked, paymentStatus: current.order.paymentStatus };
    });

    return {
      ...result.fulfillment,
      inventoryRestocked: result.inventoryRestocked,
      nextAction: isCancelled
        ? result.paymentStatus === 'REFUNDED'
          ? 'APLIIQ_CANCELLATION_CONFIRMED_AND_INVENTORY_RESTOCKED_IF_NOT_ALREADY'
          : 'APLIIQ_CANCELLATION_CONFIRMED_BUT_STRIPE_REFUND_REQUIRES_SEPARATE_RECONCILIATION'
        : fulfillment.submissionStatus === 'CANCELLATION_REQUIRED'
          ? 'CANCEL_IN_APLIIQ_DASHBOARD_IF_ELIGIBLE_THEN_RUN_RECONCILIATION_AGAIN'
          : 'PROVIDER_STATUS_SYNCED',
    };
  }

  private async restockCommittedReservation(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<boolean> {
    const reservation = await tx.stockReservation.findUnique({
      where: { orderId },
      include: { items: true },
    });
    if (!reservation || reservation.status !== 'COMMITTED' || reservation.restockedAt) {
      return false;
    }

    // Claim the one-time restock before incrementing stock. This runs in the
    // same DB transaction, so concurrent webhook/poll events cannot double-restock.
    const claimed = await tx.stockReservation.updateMany({
      where: { id: reservation.id, status: 'COMMITTED', restockedAt: null },
      data: { restockedAt: new Date() },
    });
    if (claimed.count !== 1) return false;

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
    return true;
  }

  async processFulfillmentWebhook(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid Apliiq fulfillment payload');
    }

    const root = body as Record<string, unknown>;
    const rawFulfillment = root.fulfillment;
    if (!rawFulfillment || typeof rawFulfillment !== 'object' || Array.isArray(rawFulfillment)) {
      throw new BadRequestException('Missing Apliiq fulfillment object');
    }

    const payload = rawFulfillment as Record<string, unknown>;
    const rawOrderId = payload.order_id;
    const externalOrderId =
      typeof rawOrderId === 'string' || typeof rawOrderId === 'number'
        ? String(rawOrderId).trim()
        : '';
    const providerStatus = typeof payload.status === 'string' ? payload.status.trim() : '';

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
    const normalizedStatus = providerStatus.toLowerCase();
    const isShipped = ['success', 'shipped'].includes(normalizedStatus);
    const isCancelled = ['cancelled', 'canceled'].includes(normalizedStatus);

    const result = await this.prisma.$transaction(async (tx) => {
      const initial = await tx.fulfillment.findUnique({
        where: { externalOrderId },
        select: { id: true, orderId: true },
      });
      if (!initial) throw new NotFoundException('No local fulfillment matches the Apliiq order ID');

      // Serialize webhook updates with Stripe refund and polling reconciliation.
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${initial.orderId} FOR UPDATE`;
      const fulfillment = await tx.fulfillment.findUnique({
        where: { id: initial.id },
        include: { order: true },
      });
      if (!fulfillment) throw new NotFoundException('Apliiq fulfillment record disappeared');

      // A late shipment event must never reverse a confirmed cancellation.
      if (fulfillment.submissionStatus === 'CANCELLED' && isShipped) {
        return { updated: fulfillment, order: fulfillment.order, notify: false, inventoryRestocked: false };
      }

      const updateData: Prisma.FulfillmentUpdateInput = {
        providerStatus,
        ...(isCancelled ? { submissionStatus: 'CANCELLED' } : {}),
        ...(trackingCompany !== undefined ? { trackingCompany } : {}),
        ...(trackingNumbers !== undefined ? { trackingNumbers } : {}),
        ...(trackingUrls !== undefined ? { trackingUrls } : {}),
        ...(isShipped && !fulfillment.shippedAt ? { shippedAt: new Date() } : {}),
        ...(isCancelled && fulfillment.shippedAt
          ? { lastErrorCode: 'CANCELLATION_REPORTED_AFTER_SHIPMENT_REQUIRES_MANUAL_REVIEW' }
          : isCancelled && fulfillment.order.paymentStatus !== 'REFUNDED'
            ? { lastErrorCode: 'APLIIQ_CANCELLED_AWAITING_PAYMENT_REFUND_RECONCILIATION' }
            : isCancelled
              ? { lastErrorCode: null }
              : {}),
      };

      const updated = await tx.fulfillment.update({
        where: { id: fulfillment.id },
        data: updateData,
      });

      let inventoryRestocked = false;
      // Restock only after provider cancellation is confirmed, payment is fully
      // refunded, and no shipment was recorded. The reservation marker is atomic.
      if (isCancelled && fulfillment.order.paymentStatus === 'REFUNDED' && !fulfillment.shippedAt) {
        inventoryRestocked = await this.restockCommittedReservation(tx, fulfillment.orderId);
      }

      if (
        isShipped &&
        !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(String(fulfillment.order.status))
      ) {
        await tx.order.update({
          where: { id: fulfillment.orderId },
          data: { status: 'SHIPPED' },
        });
      }

      return {
        updated,
        order: fulfillment.order,
        notify: isShipped && !fulfillment.shippedAt,
        inventoryRestocked,
      };
    });

    if (result.notify) {
      await this.notifications.orderShipped({
        email: result.order.customerEmail,
        orderNumber: result.order.orderNumber,
        trackingCompany: result.updated.trackingCompany,
        trackingNumbers: result.updated.trackingNumbers,
        trackingUrls: result.updated.trackingUrls,
      });
    }
    return {
      ...result.updated,
      inventoryRestocked: result.inventoryRestocked,
      nextAction: isCancelled
        ? result.inventoryRestocked
          ? 'PROVIDER_CANCELLATION_CONFIRMED_AND_STOCK_RESTOCKED'
          : result.updated.lastErrorCode ?? 'PROVIDER_CANCELLATION_CONFIRMED_REVIEW_PAYMENT_AND_SHIPMENT_STATE'
        : 'PROVIDER_STATUS_SYNCED',
    };
  }
}
