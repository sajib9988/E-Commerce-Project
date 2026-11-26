export type OAuthProvider = 'google' | 'facebook';

export type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
  emailVerified: boolean;
};
