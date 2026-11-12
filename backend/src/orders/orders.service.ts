import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CouponType, OrderStatus, PaymentAttemptStatus, PaymentStatus, StockReservationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentsService } from '../payments/payments.service';

const RESERVATION_MINUTES = 30;
const MAX_TRANSACTION_ATTEMPTS = 3;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly payments: PaymentsService) {}

  private async serializableRetry<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await work();
      } catch (error) {
        const code = error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code : undefined;
        // P2034 is Prisma's write-conflict/deadlock transaction retry signal.
        if (code !== 'P2034' || attempt >= MAX_TRANSACTION_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
      }
    }
  }

  // Replace with your real server-owned shipping/tax policy.
  private calculateShipping(_subtotal: Prisma.Decimal): Prisma.Decimal {
    return new Prisma.Decimal(0);
  }
  private calculateTax(_subtotal: Prisma.Decimal, _shipping: Prisma.Decimal): Prisma.Decimal {
    return new Prisma.Decimal(0);
  }

  async createPendingOrder(userId: string, dto: CreateOrderDto) {
    if (!userId) throw new BadRequestException('Authenticated user required');

    // Merge repeated product IDs before checking/decrementing stock.
    const quantities = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const line of dto.items) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
        throw new BadRequestException('Quantity must be between 1 and 99');
      }
      const key = `${line.productId}:${line.variantId ?? 'legacy'}`;
      const previous = quantities.get(key);
      quantities.set(key, { productId: line.productId, variantId: line.variantId, quantity: (previous?.quantity ?? 0) + line.quantity });
    }
    for (const item of quantities.values()) {
      if (item.quantity > 99) throw new BadRequestException('Maximum 99 units per product');
    }

    const currency = 'usd';
    const idempotencyKey = dto.idempotencyKey.trim();
    if (!idempotencyKey) throw new BadRequestException('Idempotency key required');

    try {
      return await this.serializableRetry(() =>
        this.prisma.$transaction(async (tx) => {
          const prior = await tx.order.findUnique({
            where: { idempotencyKey },
            include: { items: true, paymentAttempts: true, stockReservation: { include: { items: true } } },
          });
          if (prior) {
            if (prior.userId !== userId) throw new ConflictException('Idempotency key belongs to another user');
            return prior;
          }

          const requested = [...quantities.values()];
          const ids = [...new Set(requested.map((item) => item.productId))];
          const products = await tx.product.findMany({ where: { id: { in: ids } }, include: { variants: { select: { id: true } } } });
          if (products.length !== ids.length) throw new NotFoundException('One or more products were not found');
          const byId = new Map(products.map((product) => [product.id, product]));
          const variantIds = requested.flatMap((item) => item.variantId ? [item.variantId] : []);
          const variants = variantIds.length ? await tx.productVariant.findMany({
            where: { id: { in: variantIds } }, include: { size: true },
          }) : [];
          if (variants.length !== variantIds.length) throw new NotFoundException('One or more product variants were not found');
          const variantById = new Map(variants.map((variant) => [variant.id, variant]));
          const lineItems: Array<{
            productId: string; variantId: string | null; variantSnapshot: Prisma.InputJsonValue | undefined;
            productName: string; sku: string | null; apliiqDesignSku: string | null;
            unitPrice: Prisma.Decimal; quantity: number; lineTotal: Prisma.Decimal;
            imageUrl: string | null;
          }> = [];
          let subtotal = new Prisma.Decimal(0);

          for (const item of requested) {
            const product = byId.get(item.productId)!;
            if (!product.isActive) throw new BadRequestException('A selected product is unavailable');
            let unitPrice: Prisma.Decimal;
            let sku: string | null;
            let apliiqDesignSku: string | null;
            let variantSnapshot: Prisma.InputJsonValue | undefined;
            if (item.variantId) {
              const variant = variantById.get(item.variantId)!;
              if (variant.productId !== product.id || !variant.isActive || !variant.size.isActive) {
                throw new BadRequestException('Selected product variant is unavailable');
              }
              if (variant.apliiqColorId && !variant.apliiqVariantSku) {
                throw new BadRequestException('This Apliiq color/size has not been configured as a sellable Design yet');
              }
              unitPrice = new Prisma.Decimal((variant.salePrice ?? variant.regularPrice).toString());
              sku = variant.sku;
              apliiqDesignSku = variant.apliiqVariantSku ?? null;
              variantSnapshot = { id: variant.id, sizeId: variant.sizeId, sizeLabel: variant.size.label, colorName: variant.colorName, colorHex: variant.colorHex, apliiqColorId: variant.apliiqColorId, apliiqDesignId: variant.apliiqDesignId, sku: variant.sku, apliiqVariantSku: variant.apliiqVariantSku } as Prisma.InputJsonValue;
            } else {
              // Legacy simple products only; variant-managed products must use a variantId.
              if (product.variants?.length) throw new BadRequestException('Choose a size/variant for this product');
              unitPrice = new Prisma.Decimal((product.salePrice ?? product.regularPrice).toString());
              sku = product.sku ?? null;
              apliiqDesignSku = product.apliiqDesignSku ?? null;
            }
            if (unitPrice.lessThan(0)) throw new BadRequestException('Invalid product price');
            const lineTotal = unitPrice.mul(item.quantity);
            subtotal = subtotal.add(lineTotal);
            lineItems.push({ productId: product.id, variantId: item.variantId ?? null, variantSnapshot,
              productName: product.name, sku, apliiqDesignSku, unitPrice, quantity: item.quantity, lineTotal, imageUrl: product.imageUrl ?? null });
          }

          let shipping = this.calculateShipping(subtotal);
          const tax = this.calculateTax(subtotal, shipping);
          let discount = new Prisma.Decimal(0);
          let coupon: { id: string; code: string; type: CouponType; value: Prisma.Decimal;
            maxDiscountAmount: Prisma.Decimal | null; usageCount: number; usageLimit: number | null;
            perUserLimit: number; startsAt: Date | null; expiresAt: Date | null;
            isActive: boolean; minOrderAmount: Prisma.Decimal | null; userId: string | null; assignedEmail: string | null } | null = null;

          if (dto.couponCode?.trim()) {
            const code = dto.couponCode.trim().toUpperCase();
            coupon = await tx.coupon.findUnique({ where: { code } });
            const couponOwner = coupon?.assignedEmail
              ? await tx.user.findUnique({ where: { id: userId }, select: { email: true } })
              : null;
            const normalizedCheckoutEmail = dto.customerEmail.trim().toLowerCase();
            const now = new Date();
            if (!coupon || !coupon.isActive ||
                (coupon.assignedEmail !== null && (coupon.assignedEmail.toLowerCase() !== normalizedCheckoutEmail || coupon.assignedEmail.toLowerCase() !== couponOwner?.email.toLowerCase())) ||
                (coupon.userId !== null && coupon.userId !== userId) ||
                (coupon.startsAt && coupon.startsAt > now) ||
                (coupon.expiresAt && coupon.expiresAt <= now)) {
              throw new BadRequestException('Coupon is invalid, expired, or not assigned to this customer');
            }
            if (coupon.assignedEmail) {
              const previousPaidOrders = await tx.order.count({
                where: { userId, paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } },
              });
              if (previousPaidOrders > 0) {
                throw new ConflictException('Welcome discount is only valid on your first paid order');
              }
            }
            if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
              throw new BadRequestException('Order does not meet coupon minimum');
            }

            const userUses = await tx.couponRedemption.count({
              where: { couponId: coupon.id, userId, status: { in: ['RESERVED', 'REDEEMED'] } },
            });
            if (userUses >= coupon.perUserLimit) {
              throw new ConflictException('Coupon per-customer usage limit reached');
            }
            if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
              throw new ConflictException('Coupon usage limit reached');
            }

            if (coupon.type === CouponType.PERCENT) {
              discount = subtotal.mul(coupon.value).div(100);
              if (coupon.maxDiscountAmount && discount.greaterThan(coupon.maxDiscountAmount)) {
                discount = coupon.maxDiscountAmount;
              }
            } else if (coupon.type === CouponType.FIXED) {
              discount = coupon.value;
            } else if (coupon.type === CouponType.FREE_SHIPPING) {
              discount = shipping;
            }
            const eligibleAmount = coupon.type === CouponType.FREE_SHIPPING ? shipping : subtotal;
            if (discount.greaterThan(eligibleAmount)) discount = eligibleAmount;
            if (discount.lessThan(0)) throw new BadRequestException('Invalid coupon discount');
            if (coupon.type === CouponType.FREE_SHIPPING) shipping = shipping.sub(discount);
          }

          // Example policy: discount applies to subtotal; shipping/tax are server-calculated.
          // FREE_SHIPPING has already reduced shipping and does not reduce subtotal again.
          const subtotalDiscount = coupon?.type === CouponType.FREE_SHIPPING
            ? new Prisma.Decimal(0) : discount;
          const total = subtotal.sub(subtotalDiscount).add(shipping).add(tax);
          if (total.lessThan(0)) throw new BadRequestException('Order total cannot be negative');

          // Atomic inventory reservation. If any line fails, the transaction rolls back all decrements.
          for (const line of lineItems) {
            const result = line.variantId
              ? await tx.productVariant.updateMany({ where: { id: line.variantId, productId: line.productId, isActive: true, stockQuantity: { gte: line.quantity } }, data: { stockQuantity: { decrement: line.quantity } } })
              : await tx.product.updateMany({ where: { id: line.productId, isActive: true, stockQuantity: { gte: line.quantity } }, data: { stockQuantity: { decrement: line.quantity } } });
            if (result.count !== 1) {
              throw new ConflictException('Insufficient stock for one or more products');
            }
          }

          // Atomic global coupon-capacity reservation. Serializable retry handles concurrent conflicts.
          if (coupon) {
            const capacityWhere: Prisma.CouponWhereInput = {
              id: coupon.id,
              isActive: true,
              usageCount: coupon.usageCount,
              ...(coupon.usageLimit === null ? {} : { usageCount: { equals: coupon.usageCount, lt: coupon.usageLimit } }),
            };
            const capacity = await tx.coupon.updateMany({
              where: capacityWhere,
              data: { usageCount: { increment: 1 } },
            });
            if (capacity.count !== 1) throw new ConflictException('Coupon usage limit reached; retry checkout');
          }

          const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
          const order = await tx.order.create({
            data: {
              userId, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING',
              currency, subtotalAmount: subtotal, discountAmount: discount,
              shippingAmount: shipping, taxAmount: tax, totalAmount: total,
              shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
              billingAddress: dto.billingAddress as unknown as Prisma.InputJsonValue | undefined,
              customerEmail: dto.customerEmail,
              customerName: dto.customerName, customerPhone: dto.customerPhone,
              couponCode: coupon?.code ?? null, idempotencyKey,
              items: { create: lineItems.map((line) => ({
                productId: line.productId, productName: line.productName, sku: line.sku,
                apliiqDesignSku: line.apliiqDesignSku, variantId: line.variantId,
                variantSnapshot: line.variantSnapshot,
                unitPrice: line.unitPrice, quantity: line.quantity, lineTotal: line.lineTotal,
                imageUrl: line.imageUrl,
              })) },
              paymentAttempts: { create: {
                provider: 'STRIPE', status: PaymentAttemptStatus.CREATED,
                amount: total, currency,
              } },
              stockReservation: { create: {
                status: StockReservationStatus.RESERVED, expiresAt,
                items: { create: lineItems.map((line) => ({
                  productId: line.productId, variantId: line.variantId, quantity: line.quantity,
                })) },
              } },
              ...(coupon ? { couponRedemption: { create: {
                couponId: coupon.id, userId, discountAmount: discount,
                status: 'RESERVED',
              } } } : {}),
            },
            include: { items: true, paymentAttempts: true,
              stockReservation: { include: { items: true } }, couponRedemption: true },
          });

          return order;
        }, {
          maxWait: 5_000, timeout: 10_000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.order.findUnique({
          where: { idempotencyKey },
          include: { items: true, paymentAttempts: true, stockReservation: { include: { items: true } } },
        });
        if (existing?.userId === userId) return existing;
        throw new ConflictException('Duplicate checkout request');
      }
      throw error;
    }
  }

  // Call from a verified, amount/currency-matching Stripe paid webhook transaction.
  async commitReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservation = await tx.stockReservation.findUnique({ where: { orderId } });
    if (!reservation || reservation.status === 'RELEASED') {
      throw new ConflictException('Stock reservation is missing or already released');
    }
    if (reservation.status === 'RESERVED') {
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
    }

    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (redemption?.status === 'RESERVED') {
      await tx.couponRedemption.update({
        where: { id: redemption.id },
        data: { status: 'REDEEMED', redeemedAt: new Date() },
      });
    }
    // Do NOT decrement stock or increment Coupon.usageCount here; both were reserved at checkout.
  }

  // Call only when Stripe confirms the Checkout Session expired/cancelled, or from a trusted expiry worker.
  async releaseReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservation = await tx.stockReservation.findUnique({
      where: { orderId }, include: { items: true },
    });
    if (reservation?.status === 'RESERVED') {
      // Claim transition first. Only the transaction that wins RESERVED -> RELEASED may restock.
      const claimed = await tx.stockReservation.updateMany({
        where: { id: reservation.id, status: 'RESERVED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      if (claimed.count === 1) {
        for (const item of reservation.items) {
          if (item.variantId) {
            await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
          } else {
            await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
          }
        }
      }
    }

    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
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
  }


  async findMyOrders(userId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        include: { items: true, fulfillments: { select: { id: true, provider: true, submissionStatus: true, providerStatus: true, trackingCompany: true, trackingNumbers: true, trackingUrls: true, submittedAt: true, shippedAt: true, createdAt: true, updatedAt: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { items, pagination: { page: Math.max(page, 1), limit: take, total, pages: Math.ceil(total / take) } };
  }

  async findMyOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, paymentAttempts: { select: { id: true, status: true, amount: true, currency: true, paidAt: true } }, fulfillments: { select: { id: true, provider: true, submissionStatus: true, providerStatus: true, trackingCompany: true, trackingNumbers: true, trackingUrls: true, submittedAt: true, shippedAt: true, createdAt: true, updatedAt: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelMyOrder(userId: string, orderId: string) {
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, userId }, select: { status: true, paymentStatus: true } });
    if (!existing) throw new NotFoundException('Order not found');
    if (existing.status !== 'PENDING_PAYMENT' || existing.paymentStatus !== 'PENDING') {
      throw new ConflictException('Only unpaid pending orders can be cancelled');
    }
    // Expire the remote Stripe session first. If Stripe cannot confirm, keep the order/reservation intact.
    await this.payments.expireCheckoutSessionsForOrder(orderId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: orderId, userId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'PENDING_PAYMENT' || order.paymentStatus !== 'PENDING') {
        throw new ConflictException('Only unpaid pending orders can be cancelled');
      }
      await this.releaseReservations(tx, orderId);
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });
    });
  }

  async findAllForAdmin(page = 1, limit = 20, status?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const allowedStatuses = Object.values(OrderStatus) as string[];
    if (status && !allowedStatuses.includes(status)) throw new BadRequestException('Invalid order status filter');
    const where: Prisma.OrderWhereInput = status ? { status: status as OrderStatus } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where, include: { items: true, user: { select: { id: true, name: true, email: true } }, fulfillments: { where: { provider: "APLIIQ" }, select: { id: true, provider: true, submissionStatus: true, providerStatus: true, externalOrderId: true, trackingCompany: true, trackingNumbers: true, trackingUrls: true, submittedAt: true, shippedAt: true, lastErrorCode: true, createdAt: true, updatedAt: true } } },
        orderBy: { createdAt: 'desc' }, skip, take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, pagination: { page: Math.max(page, 1), limit: take, total, pages: Math.ceil(total / take) } };
  }

  async findOneForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { id: true, name: true, email: true } },
        paymentAttempts: true, stockReservation: { include: { items: true } }, fulfillments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatusByAdmin(orderId: string, nextStatus: string) {
    const transitions: Record<string, string[]> = {
      PROCESSING: ['SHIPPED'],
      SHIPPED: ['DELIVERED'],
    };
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (!transitions[order.status]?.includes(nextStatus)) {
        throw new ConflictException(`Invalid order status transition: ${order.status} -> ${nextStatus}`);
      }
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: nextStatus as OrderStatus },
      });
      if (changed.count !== 1) throw new ConflictException('Order status changed concurrently; refresh and retry');
      return tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    });
  }
}
