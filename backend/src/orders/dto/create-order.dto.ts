import {
  ArrayMinSize, IsArray, IsEmail, IsInt, IsObject, IsOptional,
  IsString, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString() @MaxLength(80)
  firstName!: string;
  @IsString() @MaxLength(80)
  lastName!: string;
  @IsString() @MaxLength(200)
  addressLine1!: string;
  @IsOptional() @IsString() @MaxLength(200)
  addressLine2?: string;
  @IsString() @MaxLength(100)
  city!: string;
  @IsString() @MaxLength(100)
  state!: string;
  @IsString() @MaxLength(20)
  postalCode!: string;
  @IsString() @MaxLength(100)
  country!: string;
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}

class CheckoutLineDto {
  @IsString() @MaxLength(128)
  productId!: string;

  // Required for newly managed size/SKU variants; omitted only for legacy simple products.
  @IsOptional() @IsString() @MaxLength(128)
  variantId?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress!: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

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
