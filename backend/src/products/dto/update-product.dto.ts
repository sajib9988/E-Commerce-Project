import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, Min, ArrayMaxSize, ArrayUnique,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  regularPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salePrice?: number | null;

  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @IsOptional() @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : [value]; }
    catch { return [value]; }
  }) @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsString({ each: true })
  collectionIds?: string[];

  @IsOptional() @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : [value]; }
    catch { return [value]; }
  }) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({ each: true })
  sizes?: string[];

  @IsOptional() @IsString() @MaxLength(150)
  sku?: string;

  @IsOptional() @IsString() @MaxLength(150)
  apliiqDesignSku?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stockQuantity?: number;

  @IsOptional() @Transform(({ value }) => value === undefined ? undefined : value === true || value === 'true') @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  subcategoryId?: string;
}
