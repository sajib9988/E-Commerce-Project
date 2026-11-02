import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveRefundRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  adminNote?: string;
}
