import { Prisma } from '../../generated/prisma/client';

type CouponRecord = {
  id: string;
  code: string;
  type: string;
  value: Prisma.Decimal;
  minOrderAmount: Prisma.Decimal | null;
  maxDiscountAmount: Prisma.Decimal | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class CouponMapper {
  static toPublic(coupon: CouponRecord) {
    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      minOrderAmount: coupon.minOrderAmount?.toString() ?? null,
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? null,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
    };
  }

  static toAdmin(coupon: CouponRecord) {
    return {
      ...this.toPublic(coupon),
      id: coupon.id,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      perUserLimit: coupon.perUserLimit,
      userId: coupon.userId,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}
