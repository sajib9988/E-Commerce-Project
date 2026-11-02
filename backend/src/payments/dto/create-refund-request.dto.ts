import { IsString, MaxLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsString() @MaxLength(128)
  orderId!: string;

  @IsString() @MaxLength(1000)
  reason!: string;
}
