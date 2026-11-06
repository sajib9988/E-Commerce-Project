import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
export class CreateInventoryAdjustmentDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) productId?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) variantId?: string;
  @IsIn(['INCREASE', 'DECREASE']) direction!: 'INCREASE' | 'DECREASE';
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}