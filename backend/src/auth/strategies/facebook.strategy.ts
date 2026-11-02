import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      // Placeholder values let the API boot before OAuth credentials are added.
      // Facebook login will only work after the real values are configured.
      clientID: process.env.FACEBOOK_APP_ID || 'oauth-not-configured',
      clientSecret: process.env.FACEBOOK_APP_SECRET || 'oauth-not-configured',
      callbackURL:
        process.env.FACEBOOK_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
      state: true,
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const providerEmail = profile.emails?.[0]?.value?.trim().toLowerCase() ?? null;

    return {
      provider: AuthProvider.FACEBOOK,
      providerUserId: profile.id,
      name: profile.displayName || 'Customer',
      email: providerEmail,
      // Facebook's basic profile response does not provide a reliable
      // email_verified claim. Keep this false until separately verified.
      emailVerified: false,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
