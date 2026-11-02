import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      // Placeholder values let the API boot before OAuth credentials are added.
      // Google login will only work after the real values are configured.
      clientID: process.env.GOOGLE_CLIENT_ID || 'oauth-not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'oauth-not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
      state: true,
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const providerEmail = profile.emails?.[0]?.value?.trim().toLowerCase() ?? null;
    const rawProfile = profile._json as { email_verified?: boolean };

    return {
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      name: profile.displayName || 'Customer',
      email: providerEmail,
      emailVerified: Boolean(rawProfile.email_verified && providerEmail),
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
