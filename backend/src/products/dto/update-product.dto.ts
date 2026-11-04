import { Type } from 'class-transformer';
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

  @IsOptional() @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsString({ each: true })
  collectionIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({ each: true })
  sizes?: string[];

  @IsOptional() @IsString() @MaxLength(150)
  sku?: string;

  @IsOptional() @IsString() @MaxLength(150)
  apliiqDesignSku?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stockQuantity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  subcategoryId?: string;
}
