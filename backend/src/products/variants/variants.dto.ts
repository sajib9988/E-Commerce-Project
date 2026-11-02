import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductVariantDto {
  @IsString() @MinLength(1) @MaxLength(128)
  productId!: string;

  @IsString() @MinLength(1) @MaxLength(128)
  sizeId!: string;

  @IsString() @MinLength(1) @MaxLength(100)
  sku!: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  regularPrice!: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salePrice?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stockQuantity?: number;

  @IsOptional() @IsString() @MaxLength(160)
  apliiqVariantSku?: string | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductVariantDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  sku?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  regularPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salePrice?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stockQuantity?: number;

  @IsOptional() @IsString() @MaxLength(160)
  apliiqVariantSku?: string | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
