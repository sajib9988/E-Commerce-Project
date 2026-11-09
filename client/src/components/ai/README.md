# AI Shopping Chat Widget

The AI shopping assistant frontend is implemented but intentionally **not mounted anywhere**.

## Component

`src/components/ai/ai-shopping-chat-widget.tsx`

Export:

```tsx
import { AiShoppingChatWidget } from "@/components/ai/ai-shopping-chat-widget";
```

Render `<AiShoppingChatWidget />` once inside the public storefront layout (or the root layout if it should also appear on non-storefront public pages). Do not add it to the admin layout. The component already hides itself on `/admin` routes.

## Client service

`src/service/ai-chat.service.ts`

The service is a Next.js Server Action. It calls the NestJS `POST /api/v1/ai/chat` endpoint using `NEXT_PUBLIC_BASE_URL` and the existing server-side auth-header helper. The OpenAI API key remains on the backend.

## Backend requirements

- Backend AI module is enabled.
- `OPENAI_API_KEY` is configured on the backend.
- `NEXT_PUBLIC_BASE_URL` points to the backend API base, including `/api/v1`.
- PostgreSQL pgvector extension and the AI knowledge migration are applied for CMS knowledge retrieval.
- CMS pages must be synced through the existing admin knowledge-sync endpoint before the assistant can answer from those pages.

## Behaviour

- Floating launcher, responsive chat panel, minimize/close controls.
- Starter prompts, Enter-to-send (Shift+Enter for a new line), loading and error states, retry, new conversation.
- Product recommendation cards with image, price, stock status, and product detail links.
- Admin routes are excluded.
- Conversation state is kept in component memory only; refreshing or closing the page starts a fresh conversation. Chat history is not persisted.
