import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { CouponRedemptionStatus, CouponType, PaymentAttemptStatus,
  Prisma, StockReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

const RESERVATION_MINUTES = 30;
const MAX_TRANSACTION_ATTEMPTS = 3;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const quantities = new Map<string, number>();
    for (const line of dto.items) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
        throw new BadRequestException('Quantity must be between 1 and 99');
      }
      quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    }
    for (const quantity of quantities.values()) {
      if (quantity > 99) throw new BadRequestException('Maximum 99 units per product');
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

          const ids = [...quantities.keys()];
          const products = await tx.product.findMany({ where: { id: { in: ids } } });
          if (products.length !== ids.length) throw new NotFoundException('One or more products were not found');

          const byId = new Map(products.map((product) => [product.id, product]));
          const lineItems: Array<{
            productId: string; productName: string; sku: string | null;
            unitPrice: Prisma.Decimal; quantity: number; lineTotal: Prisma.Decimal;
            imageUrl: string | null;
          }> = [];
          let subtotal = new Prisma.Decimal(0);

          for (const [productId, quantity] of quantities) {
            const product = byId.get(productId)!;
            if (!product.isActive) throw new BadRequestException('A selected product is unavailable');
            const unitPrice = new Prisma.Decimal(product.price.toString());
            if (unitPrice.lessThan(0)) throw new BadRequestException('Invalid product price');
            const lineTotal = unitPrice.mul(quantity);
            subtotal = subtotal.add(lineTotal);
            lineItems.push({
              productId, productName: product.name, sku: product.sku ?? null,
              unitPrice, quantity, lineTotal, imageUrl: product.imageUrl ?? null,
            });
          }

          let shipping = this.calculateShipping(subtotal);
          const tax = this.calculateTax(subtotal, shipping);
          let discount = new Prisma.Decimal(0);
          let coupon: { id: string; code: string; type: CouponType; value: Prisma.Decimal;
            maxDiscountAmount: Prisma.Decimal | null; usageCount: number; usageLimit: number | null;
            perUserLimit: number; startsAt: Date | null; expiresAt: Date | null;
            isActive: boolean; minOrderAmount: Prisma.Decimal | null } | null = null;

          if (dto.couponCode?.trim()) {
            const code = dto.couponCode.trim().toUpperCase();
            coupon = await tx.coupon.findUnique({ where: { code } });
            const now = new Date();
            if (!coupon || !coupon.isActive ||
                (coupon.startsAt && coupon.startsAt > now) ||
                (coupon.expiresAt && coupon.expiresAt <= now)) {
              throw new BadRequestException('Coupon is invalid or expired');
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
            const result = await tx.product.updateMany({
              where: { id: line.productId, isActive: true, stockQuantity: { gte: line.quantity } },
              data: { stockQuantity: { decrement: line.quantity } },
            });
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
              shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
              billingAddress: dto.billingAddress as Prisma.InputJsonValue | undefined,
              customerEmail: dto.customerEmail,
              customerName: dto.customerName, customerPhone: dto.customerPhone,
              couponCode: coupon?.code ?? null, idempotencyKey,
              items: { create: lineItems.map((line) => ({
                productId: line.productId, productName: line.productName, sku: line.sku,
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
                  productId: line.productId, quantity: line.quantity,
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
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
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
}
