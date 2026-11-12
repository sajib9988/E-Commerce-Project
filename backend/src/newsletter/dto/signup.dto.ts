import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class NewsletterSignupDto {
  @IsEmail() @MaxLength(320)
  email!: string;

  @IsString() @IsNotEmpty() @MaxLength(2048)
  turnstileToken!: string;

  // Optional and unchecked by default. Coupon delivery is separate from marketing consent.
  @IsOptional() @IsBoolean()
  marketingConsent?: boolean;
}
