import { Type } from 'class-transformer';
import {
  IsArray, IsNumber, IsNotEmpty, IsOptional, IsString, IsBoolean, IsInt,
  Min, MaxLength, ArrayMaxSize, ArrayUnique,
} from 'class-validator';

export class CreateProductDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  regularPrice!: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salePrice?: number | null;

  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsString({ each: true })
  collectionIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({ each: true })
  sizes?: string[];

  // Internal store SKU; never send this to Apliiq unless explicitly mapped.
  @IsOptional() @IsString() @MaxLength(150)
  sku?: string;

  // Apliiq's sellable design SKU (not a blank-garment SKU).
  @IsOptional() @IsString() @MaxLength(150)
  apliiqDesignSku?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stockQuantity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsString() @IsNotEmpty()
  categoryId!: string;

  @IsString() @IsNotEmpty()
  subcategoryId!: string;
}
