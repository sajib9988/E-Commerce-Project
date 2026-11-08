import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CouponType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, CouponTypeInput } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponMapper } from './coupon.mapper';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(normalized)) {
      throw new BadRequestException('Coupon code may contain only letters, numbers, _ and -');
    }
    return normalized;
  }

  private validateDates(startsAt?: Date | null, expiresAt?: Date | null) {
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid coupon start date');
    }
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid coupon expiry date');
    }
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      throw new BadRequestException('Coupon expiry must be after its start date');
    }
  }

  private validateValue(type: CouponTypeInput | CouponType, value: number | Prisma.Decimal) {
    const amount = Number(value.toString());
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Coupon value must be a non-negative amount');
    }
    if (type === CouponType.PERCENT && amount > 100) {
      throw new BadRequestException('Percentage coupon cannot exceed 100');
    }
    if (type === CouponType.FREE_SHIPPING && amount !== 0) {
      throw new BadRequestException('FREE_SHIPPING coupons must use value 0');
    }
  }

  async findAllForAdmin() {
    const coupons = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return coupons.map(CouponMapper.toAdmin);
  }

  async findAvailableForUser(userId: string) {
    const now = new Date();
    const customer = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ userId: null }, { userId }] },
          { OR: [{ assignedEmail: null }, { assignedEmail: customer?.email ?? '' }] },
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: { expiresAt: 'asc' },
    });
    const available = [];
    for (const coupon of coupons) {
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) continue;
      const usedByUser = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId, status: { in: ['RESERVED', 'REDEEMED'] } },
      });
      if (usedByUser >= coupon.perUserLimit) continue;
      available.push({ id: coupon.id, ...CouponMapper.toPublic(coupon) });
    }
    return available;
  }

  async findOneForAdmin(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return CouponMapper.toAdmin(coupon);
  }

  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);
    this.validateDates(dto.startsAt, dto.expiresAt);
    this.validateValue(dto.type, dto.value);
    if (dto.minOrderAmount !== undefined && dto.minOrderAmount < 0) {
      throw new BadRequestException('Minimum order amount cannot be negative');
    }
    if (dto.maxDiscountAmount !== undefined && dto.maxDiscountAmount < 0) {
      throw new BadRequestException('Maximum discount cannot be negative');
    }

    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          code,
          type: dto.type as CouponType,
          value: new Prisma.Decimal(dto.value),
          minOrderAmount: dto.minOrderAmount == null ? null : new Prisma.Decimal(dto.minOrderAmount),
          maxDiscountAmount: dto.maxDiscountAmount == null ? null : new Prisma.Decimal(dto.maxDiscountAmount),
          startsAt: dto.startsAt ?? null,
          expiresAt: dto.expiresAt ?? null,
          isActive: dto.isActive ?? true,
          usageLimit: dto.usageLimit ?? null,
          perUserLimit: dto.perUserLimit ?? 1,
          userId: dto.userId ?? null,
        },
      });
      return CouponMapper.toAdmin(coupon);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Coupon code already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');

    const type = dto.type ?? existing.type;
    const value = dto.value ?? Number(existing.value.toString());
    this.validateValue(type, value);
    this.validateDates(dto.startsAt === undefined ? existing.startsAt : dto.startsAt,
      dto.expiresAt === undefined ? existing.expiresAt : dto.expiresAt);

    try {
      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: this.normalizeCode(dto.code) }),
          ...(dto.type !== undefined && { type: dto.type as CouponType }),
          ...(dto.value !== undefined && { value: new Prisma.Decimal(dto.value) }),
          ...(dto.minOrderAmount !== undefined && {
            minOrderAmount: dto.minOrderAmount === null ? null : new Prisma.Decimal(dto.minOrderAmount),
          }),
          ...(dto.maxDiscountAmount !== undefined && {
            maxDiscountAmount: dto.maxDiscountAmount === null ? null : new Prisma.Decimal(dto.maxDiscountAmount),
          }),
          ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
          ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
          ...(dto.perUserLimit !== undefined && { perUserLimit: dto.perUserLimit }),
          ...(dto.userId !== undefined && { userId: dto.userId }),
        },
      });
      return CouponMapper.toAdmin(coupon);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Coupon code already exists');
      }
      throw error;
    }
  }

  async disable(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const disabled = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Coupon disabled', coupon: CouponMapper.toAdmin(disabled) };
  }

  async validatePreview(userId: string, dto: ValidateCouponDto) {
    if (!userId) throw new BadRequestException('Authenticated user required');
    const code = this.normalizeCode(dto.code);
    const quantities = new Map<string, { productId?: string; variantId?: string; quantity: number }>();

    for (const item of dto.items) {
      if (!item.productId && !item.variantId) {
        throw new BadRequestException('Each coupon item requires productId or variantId');
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new BadRequestException('Quantity must be between 1 and 99');
      }
      const key = item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
      const previous = quantities.get(key);
      quantities.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: (previous?.quantity ?? 0) + item.quantity,
      });
    }
    for (const item of quantities.values()) {
      if (item.quantity > 99) throw new BadRequestException('Maximum 99 units per product/variant');
    }

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    const customer = coupon?.assignedEmail
      ? await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      : null;
    const now = new Date();
    if (!coupon || !coupon.isActive ||
      (coupon.assignedEmail !== null && coupon.assignedEmail.toLowerCase() !== customer?.email.toLowerCase()) ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.expiresAt && coupon.expiresAt <= now)) {
      throw new BadRequestException('Coupon is invalid or expired');
    }
    if (coupon.userId && coupon.userId !== userId) {
      throw new BadRequestException('Coupon is not assigned to this customer');
    }

    const productIds = [...new Set([...quantities.values()].flatMap((item) => item.productId ? [item.productId] : []))];
    const variantIds = [...new Set([...quantities.values()].flatMap((item) => item.variantId ? [item.variantId] : []))];
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, regularPrice: true, salePrice: true },
      }),
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true, product: { isActive: true }, size: { isActive: true, template: { isActive: true } } },
        select: { id: true, productId: true, regularPrice: true, salePrice: true },
      }),
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    if (products.length !== productIds.length || variants.length !== variantIds.length) {
      throw new BadRequestException('One or more products or variants are unavailable');
    }

    let subtotal = new Prisma.Decimal(0);
    for (const item of quantities.values()) {
      let price: Prisma.Decimal;
      if (item.variantId) {
        const variant = variantById.get(item.variantId);
        if (!variant || (item.productId && item.productId !== variant.productId)) {
          throw new BadRequestException('Selected variant does not belong to the supplied product');
        }
        price = new Prisma.Decimal((variant.salePrice ?? variant.regularPrice).toString());
      } else {
        const product = item.productId ? productById.get(item.productId) : undefined;
        if (!product) throw new BadRequestException('One or more products are unavailable');
        price = new Prisma.Decimal((product.salePrice ?? product.regularPrice).toString());
      }
      subtotal = subtotal.add(price.mul(item.quantity));
    }

    if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
      throw new BadRequestException('Order does not meet coupon minimum');
    }

    const usedByUser = await this.prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId, status: { in: ['RESERVED', 'REDEEMED'] } },
    });
    if (usedByUser >= coupon.perUserLimit) {
      throw new ConflictException('Coupon per-customer usage limit reached');
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new ConflictException('Coupon usage limit reached');
    }

    // Preview only: checkout recalculates the authoritative shipping/tax totals.
    const shippingEstimate = new Prisma.Decimal(0);
    let discount = new Prisma.Decimal(0);
    if (coupon.type === CouponType.PERCENT) {
      discount = subtotal.mul(coupon.value).div(100).toDecimalPlaces(2);
      if (coupon.maxDiscountAmount && discount.greaterThan(coupon.maxDiscountAmount)) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.type === CouponType.FIXED) {
      discount = coupon.value;
    } else if (coupon.type === CouponType.FREE_SHIPPING) {
      discount = shippingEstimate;
    }

    const eligibleAmount = coupon.type === CouponType.FREE_SHIPPING ? shippingEstimate : subtotal;
    if (discount.greaterThan(eligibleAmount)) discount = eligibleAmount;
    const payableEstimate = subtotal.sub(coupon.type === CouponType.FREE_SHIPPING
      ? new Prisma.Decimal(0) : discount).add(shippingEstimate);

    return {
      valid: true,
      ...CouponMapper.toPublic(coupon),
      subtotal: subtotal.toString(),
      discountAmount: discount.toString(),
      shippingEstimate: shippingEstimate.toString(),
      payableEstimate: payableEstimate.toString(),
      message: 'Coupon is valid. Final totals are recalculated during checkout.',
    };
  }
}
