# Storefront (Next.js)

## Local development

Use separate ports for the frontend and backend:

| Service | Local URL | Port |
|---|---|---:|
| Next.js storefront | http://localhost:3000 | 3000 |
| NestJS API | http://localhost:5000/api/v1 | 5000 |
| PostgreSQL | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BASE_URL` to the backend API base URL.

```bash
pnpm install
pnpm dev
```

Next.js uses port 3000 by default. To use a different port, run `pnpm dev -- --port 3001`.

## Build and start

```bash
pnpm build
pnpm start
```

The public homepage is the storefront entry point. Product and collection links lead to the live catalog routes; prices and inventory are loaded from the backend, not hard-coded into the homepage.

## Environment

See `.env.example` for the local API URL. Do not commit real credentials or production secrets.
