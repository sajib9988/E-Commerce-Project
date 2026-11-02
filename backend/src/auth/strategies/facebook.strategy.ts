import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID ?? '',
      clientSecret: process.env.FACEBOOK_APP_SECRET ?? '',
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
      state: true,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
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
