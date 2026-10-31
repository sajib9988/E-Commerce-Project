import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponTypeInput {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export class CreateCouponDto {
  @IsString() @MinLength(3) @MaxLength(64)
  code!: string;

  @IsEnum(CouponTypeInput)
  type!: CouponTypeInput;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  value!: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  minOrderAmount?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  maxDiscountAmount?: number;

  @IsOptional() @Type(() => Date)
  startsAt?: Date;

  @IsOptional() @Type(() => Date)
  expiresAt?: Date;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  usageLimit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000)
  perUserLimit?: number;

  // Optional for user-specific coupons; server still checks the authenticated user.
  @IsOptional() @IsString() @MaxLength(128)
  userId?: string;
}
