import { IsString, MinLength } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @MinLength(1)
  orderId!: string;
}
