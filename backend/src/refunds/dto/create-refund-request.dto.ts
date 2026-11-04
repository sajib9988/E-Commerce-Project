import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  reason!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  customerNote!: string;
}
