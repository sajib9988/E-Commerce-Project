import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExchangeOAuthHandoffDto {
  @IsString() @MinLength(32) @MaxLength(200)
  code!: string;
}
