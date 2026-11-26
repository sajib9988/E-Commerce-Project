import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { AuthService } from '../auth.service';
import type { OAuthProfile } from '../oauth.types';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService, private readonly authService: AuthService) {
    const apiBaseUrl = (config.get<string>('API_BASE_URL') || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    super({
      clientID: config.get<string>('FACEBOOK_APP_ID') || '',
      clientSecret: config.get<string>('FACEBOOK_APP_SECRET') || '',
      callbackURL: config.get<string>('FACEBOOK_CALLBACK_URL') || apiBaseUrl + '/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      enableProof: true,
      state: true,
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Facebook did not provide an email address. Allow email permission and try again.');
    }
    const oauthProfile: OAuthProfile = {
      provider: 'facebook',
      providerAccountId: profile.id,
      email,
      name: profile.displayName?.trim() || email.split('@')[0],
      // Facebook does not provide a trustworthy email_verified assertion.
      // Verify this address through the store's existing OTP flow.
      emailVerified: false,
    };
    return this.authService.authenticateOAuthProfile(oauthProfile);
  }
}
