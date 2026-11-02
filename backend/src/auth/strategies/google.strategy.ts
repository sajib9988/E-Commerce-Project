import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
      state: true,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
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
