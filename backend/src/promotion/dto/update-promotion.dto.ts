import { Type } from 'class-transformer';
import {
  IsBoolean, IsDate, IsIn, IsNumber, IsOptional, IsString, IsUrl,
  Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class UpdatePromotionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsIn(['AUTOMATIC', 'POPUP', 'VOLUME', 'FREE_SHIPPING'])
  type?: 'AUTOMATIC' | 'POPUP' | 'VOLUME' | 'FREE_SHIPPING';

  @IsOptional() @IsIn(['PERCENTAGE', 'FIXED'])
  discountType?: 'PERCENTAGE' | 'FIXED';

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000)
  discountValue?: number;

  @IsOptional() @IsBoolean()
  couponRequired?: boolean;

  @IsOptional() @IsBoolean()
  isSignupOffer?: boolean;

  @IsOptional() @IsString() @MaxLength(160)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsUrl({ require_protocol: true })
  bannerImage?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  startsAt?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  endsAt?: Date;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
