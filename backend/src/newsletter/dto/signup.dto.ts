import { IsBoolean, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class NewsletterSignupDto {
  @IsEmail() @MaxLength(320)
  email!: string;

  // Optional and unchecked by default. Coupon delivery is separate from marketing consent.
  @IsOptional() @IsBoolean()
  marketingConsent?: boolean;
}
