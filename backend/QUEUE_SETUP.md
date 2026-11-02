# Redis and BullMQ setup

The backend uses Redis-backed BullMQ queues for reservation-expiry scans and OTP email delivery.

## Local development

1. Start Redis locally or with Docker, for example: `docker run --name ecommerce-redis -p 6379:6379 -d redis:7-alpine`.
2. Set `REDIS_URL=redis://127.0.0.1:6379` in the backend environment.
3. Install dependencies from the repository's intended pnpm workspace root and commit the resulting lockfile update.
4. Start the backend. The reservation queue schedules a repeat scan every 30 seconds; OTP emails are placed on the email queue and retried with exponential backoff.
5. Check Redis connectivity and queue failure behavior before testing checkout or OTP flows.

## Production

- Do not expose Redis publicly. Use a private network, ACL/password authentication and TLS where supported.
- Set `REDIS_URL` to the private Redis endpoint with credentials/TLS as required by the provider.
- Use persistent Redis storage and monitoring appropriate to the deployment.
- Queue jobs may retry; email delivery should be treated as at-least-once, so duplicate email delivery is possible. Inventory correctness remains enforced by PostgreSQL transactions and the RESERVED -> RELEASED state transition.
- Configure a failed-job alert/retention policy and monitor the queue before enabling production checkout.

## Queues

- `reservation-expiry`: repeatable scan; releases expired unpaid reservations and cancels eligible pending orders.
- `email`: OTP email delivery with 5 attempts and exponential backoff.

Prisma migration/generation, package installation, builds and tests have not been run by the assistant; run them locally before merge.
