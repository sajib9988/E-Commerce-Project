import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgetPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
