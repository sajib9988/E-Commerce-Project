import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthLoginDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
