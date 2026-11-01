# Commerce integration QA checklist

This checklist is for the feature branch `feature/prisma-schema-alignment`. It is a test plan, not evidence that tests have already passed.

## Before running tests

- Install the backend dependencies from `backend/package.json`.
- Configure a disposable PostgreSQL database and test-only Stripe credentials.
- Run Prisma format, validate and generate; review/apply the migration only to the disposable database.
- Keep `APLIIQ_MODE=mock` for all local integration tests.
- Do not use live Stripe or Apliiq credentials for these tests.

## Product pricing

- Create a product with `regularPrice=100` and no `salePrice`; verify checkout uses 100.
- Create a product with `regularPrice=100` and `salePrice=80`; verify product response shows both values and checkout/coupon preview use 80.
- Reject a sale price equal to or greater than regular price.
- Update regular price while a sale price exists; reject the update if the sale price is no longer lower.
- Clear sale price with `salePrice=null`; verify checkout returns to regular price.
- Verify sizes remain a dynamic string array, internal store SKU persists, and `apliiqDesignSku` persists separately.

## Orders, stock and coupons

- Submit duplicate product lines; verify quantities merge before stock validation.
- Submit an order with insufficient stock; verify no partial stock decrement.
- Submit the same order idempotency key twice for the same user; verify the same order is returned.
- Reuse another user's idempotency key; verify conflict.
- Test coupon start/expiry, minimum amount, per-user limit and global usage limit.
- Run two concurrent checkouts against the final unit of stock; only one should reserve it.
- Run two concurrent checkouts against the final coupon use; only one should reserve it.

## Stripe Checkout and webhooks

- Repeatedly call checkout for one order; verify an open Checkout Session URL is reused.
- Send concurrent checkout requests for one order; verify they converge on one PaymentAttempt/Stripe idempotency key.
- Simulate Stripe retrieval failure for an existing session; verify the API does not create a new session.
- Deliver the same completed webhook more than once; verify one paid order, one committed stock reservation and one redeemed coupon.
- Deliver an expired webhook more than once; verify inventory/coupon usage is released only once.
- Expire one attempt while another remains active; verify reservations are not released yet.
- Deliver a late successful payment after reservations were released; verify manual-review flag is set and Apliiq is not called.
- Complete a second successful attempt after the order is already paid; verify it is flagged for manual review and no automatic refund is issued.
- Send invalid signature, amount, currency or mismatched metadata; verify the webhook is rejected and no order is marked paid.
- Verify the ADMIN/SUPER_ADMIN-only endpoint `GET /api/v1/payments/manual-review` returns flagged attempts and is inaccessible to USER.

## Apliiq mock/live boundary

- With `APLIIQ_MODE=mock` and no Apliiq credentials, submit a paid order; verify a synthetic `mock_...` provider ID is saved.
- Spy on/disable outbound network access; verify mock mode makes no HTTP request.
- Verify an unpaid order cannot be submitted.
- Verify a repeated submission with an accepted external order ID does not create another provider order.
- Simulate timeout/ambiguous provider response; verify status becomes UNKNOWN and no blind retry is sent.
- Deliver repeated fulfillment webhooks; verify tracking fields update idempotently.
- Verify a shipment webhook changes order status to SHIPPED, never DELIVERED.
- Before live mode, verify the HMAC and webhook-token procedure against current Apliiq documentation and use a test/live credential boundary.

## Remaining production work

- Replace zero-value shipping/tax placeholders with the approved US shipping and tax calculation.
- Confirm `apliiqDesignSku` is populated with the sellable design SKU and never a blank-garment SKU.
- Implement durable Apliiq outbox/queue processing and reconciliation for UNKNOWN submissions before production.
- Add an admin resolution workflow for manual-review captures (inspect, refund through a separate approved process, or resolve inventory); do not auto-refund silently.
- Update the Next.js product form and API client to submit `regularPrice` and optional `salePrice`.

## Not run in this environment

No dependency install, Prisma CLI command, migration, TypeScript build, Jest test, database connection, Stripe request or Apliiq request was executed while preparing this checklist.
