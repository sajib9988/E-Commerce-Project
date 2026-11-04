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
