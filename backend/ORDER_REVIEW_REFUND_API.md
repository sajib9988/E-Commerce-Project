# Order, Reviews and Refund APIs

All routes use the existing global JWT guard. Routes marked Admin require ADMIN or SUPER_ADMIN.

## Orders

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | /api/v1/orders | Customer | Create pending order (existing) |
| GET | /api/v1/orders/me | Customer | Paginated order history |
| GET | /api/v1/orders/:id | Owner | Order detail; other customers receive 404 |
| POST | /api/v1/orders/:id/cancel | Owner | Cancel unpaid PENDING_PAYMENT order and release reservation |
| GET | /api/v1/admin/orders | Admin | Paginated order list; optional status filter |
| GET | /api/v1/admin/orders/:id | Admin | Full operational order detail |
| PATCH | /api/v1/admin/orders/:id/status | Admin | PROCESSING -> SHIPPED -> DELIVERED only |

The customer cannot cancel paid/in-fulfillment orders. Refunds use the dedicated workflow.

## Product reviews

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | /api/v1/products/:productId/reviews | Customer | Submit a review; requires a paid order containing the product |
| GET | /api/v1/products/:productId/reviews | Public | Approved reviews only |
| PATCH | /api/v1/reviews/:id | Owner | Edit own review; edited review returns to PENDING |
| DELETE | /api/v1/reviews/:id | Owner | Delete own review |
| GET | /api/v1/admin/reviews | Admin | List reviews; optional status filter |
| PATCH | /api/v1/admin/reviews/:id/moderate | Admin | Approve/reject pending review |

One review per customer/product is enforced by a database unique constraint. A purchase must be paid; order delivery is not required for the first version.

## Refund requests

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | /api/v1/orders/:orderId/refund-requests | Owner | Request a refund for a paid order |
| GET | /api/v1/refund-requests/me | Customer | Own refund requests |
| GET | /api/v1/refund-requests/:id | Owner | Own refund request detail |
| GET | /api/v1/admin/refund-requests | Admin | List requests; optional status filter |
| PATCH | /api/v1/admin/refund-requests/:id/approve | Admin | Issue full Stripe refund |
| PATCH | /api/v1/admin/refund-requests/:id/reject | Admin | Reject with required admin note |

### Refund safety and first-version policy

- Customer-supplied amount, currency, PaymentIntent ID, and Stripe identifiers are never accepted.
- The server selects the successful Stripe payment attempt and stores the order total as the requested amount.
- Only one successful Stripe capture is eligible for this automated approval path. Multiple successful captures must be resolved through the existing manual payment-review workflow.
- Admin approval issues a full refund only; partial/item-level refunds are not implemented.
- Stripe idempotency key is `refund-request:<requestId>`. If Stripe's response is ambiguous, the request remains PROCESSING and the same approval must be retried; do not create another request.
- Shipping/tax calculations remain deferred. The refund request uses the existing persisted order total.
- Rejected requests may be resubmitted; active or completed requests cannot be duplicated.

## Required owner validation before merge

1. Run pnpm install and commit the correct lockfile if workspace metadata changed (no new dependencies were added here).
2. Run Prisma format/validate/generate and create/review the migration for the new models/enums/relations.
3. Run backend build, lint, unit and integration tests.
4. Test order ownership isolation, unpaid cancellation/restock, allowed/blocked status transitions, verified review eligibility, duplicate review constraint, public moderation filtering, concurrent refund requests, Stripe idempotent approval and ambiguous Stripe timeout recovery.
5. Verify Stripe test-mode refunds before enabling live refunds.
