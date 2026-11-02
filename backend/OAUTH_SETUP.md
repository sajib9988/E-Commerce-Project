# Google and Facebook OAuth setup

OAuth routes are part of the NestJS AuthModule. Configure the provider credentials before using them.

## Environment variables

```env
OAUTH_SESSION_SECRET=replace-with-a-long-random-secret

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/v1/auth/facebook/callback

STOREFRONT_ORIGIN=http://localhost:3000
```

Use the actual public API origin and HTTPS callback URLs in production. Keep provider secrets only in the backend environment; never expose them through `NEXT_PUBLIC_*` variables.

## Google provider

1. Create/select a project in Google Cloud Console.
2. Configure the OAuth consent screen and add the required test users while the app is in testing.
3. Create an OAuth 2.0 Web application client.
4. Add the exact value of `GOOGLE_CALLBACK_URL` to Authorized redirect URIs.
5. Copy the client ID and secret into the backend environment.
6. The strategy requests `email` and `profile`. Google email is marked verified only when Google's profile includes `email_verified: true`.

## Facebook provider

1. Create/select an app in Meta for Developers.
2. Add Facebook Login and configure its Valid OAuth Redirect URI to exactly match `FACEBOOK_CALLBACK_URL`.
3. Request the `email` permission and complete any required app review / business verification before public release.
4. Copy the App ID and App Secret into the backend environment.
5. Facebook may omit email even when the email permission is requested. In that case the API rejects account creation and asks the user to allow email permission / try another sign-in method. Do not invent an email.
6. Facebook's basic profile response does not provide a reliable verified-email claim here, so `emailVerified` remains false.

## API routes

- `GET /api/v1/auth/google` — starts Google consent.
- `GET /api/v1/auth/google/callback` — validates callback state, persists the provider identity and returns the app session payload.
- `GET /api/v1/auth/facebook` — starts Facebook consent.
- `GET /api/v1/auth/facebook/callback` — validates callback state, persists the provider identity and returns the app session payload.

The callback response has the same `accessToken`, `refreshToken`, and `user` shape as the existing login service. The storefront must consume this response and store/use tokens according to the existing auth contract. A dedicated storefront callback page / popup message bridge is not included in this backend PR.

## Account persistence and linking policy

- First social sign-up creates a normal `User` row with name, email, avatar URL, USER role, and no password.
- A `UserAuthProvider` row stores GOOGLE / FACEBOOK plus the provider's stable user ID.
- A repeat login resolves by provider + provider user ID, not by email.
- If the provider email already belongs to another account, the API returns a conflict. It never silently links accounts by matching email.
- Google email is marked verified only when Google's verified claim is true. Facebook email is stored but remains unverified unless a separate verification flow confirms it.

## Security / release checklist

- Use HTTPS in production and a long random `OAUTH_SESSION_SECRET`; cookie-session signs the temporary Passport OAuth state used for CSRF protection.
- Configure exact callback URLs and allowed storefront origins.
- Keep OAuth secrets out of source control and client bundles.
- Before public release, complete provider dashboard verification/app review and test denied consent, missing email, duplicate callbacks, existing-email conflict, and account linking.
- Do not treat this PR as a complete storefront UI integration; the callback currently returns JSON.
