<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.


## Project backend configuration

The NestJS API listens on port `5000` by default. Keep Next.js on `3000`; the storefront's `NEXT_PUBLIC_BASE_URL` should point to `http://localhost:5000/api/v1` locally.

Security headers are applied with Helmet. When adding or changing backend dependencies, regenerate and commit `pnpm-lock.yaml` using the repository's pinned pnpm version before using frozen-lockfile installs.


Copy `.env.example` to `.env` and configure the services below before running the API:

- **Redis:** Set `REDIS_URL` to the same private Redis service used by BullMQ. The global request throttler and OTP failed-attempt counters now use Redis, so all API instances share the same limits.
- **Reverse proxy:** Set `TRUST_PROXY=1` only when the VPS origin is firewalled to accept traffic from the trusted Cloudflare proxy path. Do not trust forwarded headers from direct public clients.
- **Turnstile:** Configure `TURNSTILE_SECRET_KEY` in production. Registration and password-reset verification fail closed when it is missing.
- **OAuth:** Configure `GOOGLE_CLIENT_ID` and/or `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`. The API validates provider tokens server-side at `POST /auth/oauth/google` or `POST /auth/oauth/facebook`; send `{ "accessToken": "..." }`.
- **Refresh sessions:** `POST /auth/refresh` rotates the refresh token. `POST /auth/logout` expects the refresh token in the request body so the server can revoke its stored session. Existing refresh tokens issued before the refresh-session migration are not in the database; users must sign in again after that migration is deployed.
- **Email notifications:** Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and `GMAIL_USER` to use Nodemailer with Gmail's OAuth2-authenticated SMTP transport. Optionally set `GMAIL_FROM` for the visible sender address. The Gmail REST API is not used. Alternatively, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. Welcome-coupon, order-confirmation, and shipping-update emails run through BullMQ's `email` queue; OTP emails are sent immediately and are never stored in Redis job data. Provider failures are retried by BullMQ in production.

### Catalog pagination

Public catalog endpoints preserve the legacy array response when no pagination query is supplied. Add `page` or `limit` to receive `{ items, pagination }`.

- `GET /products?page=1&limit=20&search=shirt&sortBy=createdAt&sortOrder=desc`
- `GET /collections?page=1&limit=20&search=summer`

Admin catalog endpoints include inactive records:

- `GET /products/admin/list?page=1&limit=20&isActive=false`
- `GET /collections/admin/list?page=1&limit=20&isActive=false`

### Database migrations

Run `pnpm db:deploy` after setting the production `DATABASE_URL`. The authentication and Stripe Checkout changes add these migrations:

- `20261104000300_auth_oauth_refresh_sessions`
- `20261104000400_checkout_session_expiry`

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
