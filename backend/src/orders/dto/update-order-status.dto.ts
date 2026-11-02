import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['PROCESSING', 'SHIPPED', 'DELIVERED'])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
