import {
  ArrayMinSize, IsArray, IsEmail, IsInt, IsObject, IsOptional,
  IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CheckoutLineDto {
  @IsString() @MaxLength(128)
  productId!: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];

  @IsObject()
  shippingAddress!: Record<string, unknown>;

  @IsOptional() @IsObject()
  billingAddress?: Record<string, unknown>;

  @IsEmail()
  customerEmail!: string;

  @IsOptional() @IsString() @MaxLength(160)
  customerName?: string;

  @IsOptional() @IsString() @MaxLength(40)
  customerPhone?: string;

  @IsOptional() @IsString() @MaxLength(64)
  couponCode?: string;

  // Generate this once per checkout attempt in the client and reuse on retry.
  @IsString() @MaxLength(128)
  idempotencyKey!: string;
}
