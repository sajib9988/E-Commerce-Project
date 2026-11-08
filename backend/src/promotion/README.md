# Promotions and email signup discount

## Endpoints

- `GET /api/v1/promotions/active-popup` — public active signup popup configuration.
- `GET /api/v1/promotions` — ADMIN/SUPER_ADMIN list.
- `POST /api/v1/promotions` — ADMIN/SUPER_ADMIN create.
- `PATCH /api/v1/promotions/:id` — ADMIN/SUPER_ADMIN update.
- `DELETE /api/v1/promotions/:id` — ADMIN/SUPER_ADMIN disable.
- `POST /api/v1/newsletter/signup` — public email signup, rate-limited to 3 requests/minute.

## Configure a 20% signup popup

Create a promotion using the admin endpoint:

```json
{
  "name": "Welcome email signup",
  "type": "POPUP",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "couponRequired": true,
  "isSignupOffer": true,
  "title": "Get 20% OFF your first order",
  "description": "Enter your email and we'll send you a unique one-time code.",
  "startsAt": "2026-11-08T00:00:00.000Z",
  "endsAt": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```

Only one active signup offer is intended. Creating or updating a signup offer disables the other currently active signup offer.

## Signup behavior

- The coupon is generated server-side and emailed through the existing EmailModule queue.
- Coupon is one-time-use, expires within seven days (or at promotion end, whichever comes first), and is bound to the submitted email.
- Checkout verifies the coupon email against both the authenticated account email and checkout email.
- Marketing consent is optional and separate from the one-time coupon delivery email.
- Repeated signup requests do not generate another coupon.
- Automatic sale/flash-sale pricing at checkout is not part of this initial slice; this module currently manages promotion records and the signup popup.
