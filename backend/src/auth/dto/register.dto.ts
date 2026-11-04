import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Frontend sends the Cloudflare Turnstile response token with registration.
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
