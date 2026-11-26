import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import type { OAuthProfile } from '../oauth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService, private readonly authService: AuthService) {
    const apiBaseUrl = (config.get<string>('API_BASE_URL') || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') || apiBaseUrl + '/auth/google/callback',
      scope: ['email', 'profile'],
      state: true,
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const emailVerified = (profile._json as { email_verified?: boolean }).email_verified === true;
    if (!email || !emailVerified) {
      throw new UnauthorizedException('Google did not provide a verified email address');
    }
    const oauthProfile: OAuthProfile = {
      provider: 'google',
      providerAccountId: profile.id,
      email,
      name: profile.displayName?.trim() || email.split('@')[0],
      emailVerified,
    };
    return this.authService.authenticateOAuthProfile(oauthProfile);
  }
}
