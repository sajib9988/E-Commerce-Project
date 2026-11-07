# AI Shopping Assistant

## Features
- Public customer chat endpoint: POST /api/v1/ai/chat
- Live product lookup from the existing Product, ProductVariant and ProductArtwork tables
- CMS policy ingestion and pgvector similarity search
- Admin-only CMS sync endpoint: POST /api/v1/ai/knowledge/cms/:pageId/sync

## Environment
Add these variables to the backend environment:

```env
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## Install dependencies
From the backend directory:

```bash
pnpm add @langchain/core @langchain/openai @langchain/textsplitters
```

Run `pnpm install` and commit the updated pnpm-lock.yaml after dependency installation.

## Database
The migration creates the pgvector extension and ai_knowledge_chunks table.
The PostgreSQL server must have the pgvector extension files installed before this migration is applied.

```bash
pnpm exec prisma migrate deploy
```

## First CMS sync
1. Publish a CMS page.
2. Call the admin-only sync endpoint with that page ID.
3. The sync removes previous chunks for that page and stores newly generated embeddings.

## Notes
- Product prices and stock are retrieved live from PostgreSQL.
- CMS knowledge is retrieved from embeddings.
- This initial version uses text matching for products and requires explicit CMS sync.
- Add a BullMQ ingestion worker for automatic/retryable CMS indexing before production scale.
- The public chat endpoint should be protected with appropriate rate limits and monitoring.
