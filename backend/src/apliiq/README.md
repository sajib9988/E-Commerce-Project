# Apliiq Hybrid Artwork and Design Workflow

All routes below are protected for `ADMIN` and `SUPER_ADMIN`.

## 1. Add print-ready artwork to a store Product

If the Product's existing Cloudinary image is itself the print-ready file, reuse it without uploading again:

`POST /admin/apliiq/products/:productId/artworks/use-product-image`

Optional JSON body:

```json
{ "name": "Wolf chest print" }
```

If the Product image is only a shirt preview/mockup, upload a separate transparent/high-resolution print file:

`POST /admin/apliiq/products/:productId/artworks`

Use `multipart/form-data` with:
- `name`: artwork name (Apliiq allows up to 50 characters)
- `image`: PNG, JPEG, or WebP file (up to 12 MB)

The upload uses the existing CloudinaryService and the `ecommerce/artworks` folder. It does not create another Cloudinary integration.

## 2. Save one or more print placements

`POST /admin/apliiq/artworks/:artworkId/placements`

Example:

```json
{
  "locationId": "4587",
  "service": "dtgprint",
  "note": "Center chest",
  "boxId": 1,
  "widthInches": 10,
  "heightInches": 10
}
```

Create a separate placement record for each artwork placement (front, back, sleeve, etc.). Use the location IDs and supported services returned by Apliiq for the selected blank product. For screen print or embroidery, provide `printColors` as the documented comma-separated hex color string.

## 3. Create the sellable Apliiq Design

`POST /admin/apliiq/products/:productId/designs`

Example request:

```json
{
  "ProductCode": "mens_Comfort-Colors-Heavyweight-T-Shirt",
  "ProductId": 409,
  "ColorId": 521,
  "MockupTemplateId": 3455677,
  "Locations": [
    {
      "Id": 4587,
      "ImagePath": "https://example-catalog-image.example/front.jpg"
    }
  ],
  "Placements": [
    { "placementId": "saved-placement-record-id" }
  ]
}
```

Replace the sample product, color, location, mockup-template and image values with the exact values returned by the Apliiq Product API/account. The service resolves each saved placement to its ProductArtwork and constructs Apliiq's documented nested `Locations[].Artworks[]` payload. When a mockup template has multiple artwork boxes, save the corresponding `boxId` on each placement.

The API response's generated location mockup URLs are saved in `ApliiqProductDesign.mockupUrl/mockupUrls`. Public Product and Collection responses include `apliiqDesigns`; storefront collection cards prefer the generated mockup and fall back to the regular Product image.

## 4. Customer order and fulfillment

Creating a Design maps the provider's size SKUs onto the active local ProductVariants for that Apliiq color. Checkout snapshots that provider SKU. The existing paid-order fulfillment worker sends the provider-specific design SKU to Apliiq; it must not send the store's internal SKU.

## Important testing and production notes

- `APLIIQ_MODE=mock` is the safe default for local API-flow tests. Mock mode returns mock IDs/SKUs; it cannot generate a real garment mockup or verify Apliiq's live rendering.
- Switch to `APLIIQ_MODE=live` only after configuring the real API credentials and validating ProductCode, ColorId, Location IDs, service, artwork and mockup template against your Apliiq account.
- Apliiq documents no sandbox/development environment for API orders. Do not test the live order endpoint with a real customer order. Their published testing instructions require a real order and cancellation; coordinate with Apliiq before doing that.
- Run `pnpm db:deploy` from the backend directory to apply the migrations, then `pnpm build` (which now runs `prisma generate` first).

## 5. Apliiq order cancellation and reconciliation

Apliiq's published API documents `GET /v1/Order/:OrderId` for retrieving the provider's current order status. It does **not** document an API cancellation endpoint. Cancellation must therefore be requested manually in the Apliiq dashboard when the order is still eligible; cancellation is not guaranteed once base garments have been ordered or production has started.

After a Stripe full-refund webhook, the local fulfillment is marked `CANCELLATION_REQUIRED` when a provider order may exist. Inventory is deliberately **not** restored at this point.

Admin cancellation workflow:

1. Request cancellation locally:

   `POST /api/v1/admin/apliiq/orders/:orderId/cancel-request`

   This atomically stops a fulfillment that is still `QUEUED`. If a provider request may already be in flight or an Apliiq order exists, it marks the fulfillment `CANCELLATION_REQUIRED` and returns the dashboard action. It never claims that Apliiq has cancelled the order and never restores stock merely because cancellation was requested.

2. Open the order in the Apliiq dashboard and request cancellation if the provider still allows it. Orders already in production or shipped may not be cancellable.

3. Confirm provider state:

   `POST /api/v1/admin/apliiq/orders/:orderId/reconcile`

This calls Apliiq's authenticated Get Order endpoint and syncs provider status and available tracking details. If the POST response timed out before the provider order ID was saved, it first checks Apliiq's documented recent-orders endpoint and matches the local `order.id` against `StoreSystemOrderId`. If Apliiq reports `Cancelled` / `Canceled` through polling or its signed fulfillment webhook, and the Stripe payment is already fully refunded, and no shipment was recorded, the committed stock reservation is restored exactly once using `stock_reservations.restockedAt`. If Apliiq reports a production or shipment status, stock remains committed and requires operational review. A cancellation notification received after a shipment record never triggers restocking.

For a refund while the fulfillment outbox is still `QUEUED`, the local outbox item is cancelled and stock can be restored immediately because no provider request was submitted. If submission is `SUBMITTING` or `UNKNOWN`, do not restock until the provider order is identified and its cancellation is confirmed.

Do not treat an Apliiq cancellation as a Stripe refund. The customer's Stripe payment must independently be refunded and confirmed by the signed Stripe webhook.
