import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateRefundRequestDto {
  @IsString() @MinLength(5) @MaxLength(120) reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
