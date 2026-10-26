import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CouponTypeInput } from './create-coupon.dto';

export class UpdateCouponDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(64)
  code?: string;

  @IsOptional() @IsEnum(CouponTypeInput)
  type?: CouponTypeInput;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  value?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  minOrderAmount?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional() @Type(() => Date)
  startsAt?: Date | null;

  @IsOptional() @Type(() => Date)
  expiresAt?: Date | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  usageLimit?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000)
  perUserLimit?: number;

  @IsOptional() @IsString() @MaxLength(128)
  userId?: string | null;
}
