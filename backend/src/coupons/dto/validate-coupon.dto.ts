import {
  ArrayMinSize, IsArray, IsInt, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CouponCartLineDto {
  @IsString() @MaxLength(128)
  productId!: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  quantity!: number;
}

export class ValidateCouponDto {
  @IsString() @MaxLength(64)
  code!: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => CouponCartLineDto)
  items!: CouponCartLineDto[];
}
