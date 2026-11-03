# Treaded Brands Catalog & Homepage CMS Contract

## Product design style
Products may use one of these optional values:
- `REALISTIC`
- `CARTOON`

Public product filters:
- `GET /api/v1/products?designStyle=REALISTIC`
- `GET /api/v1/products?designStyle=CARTOON`
- `GET /api/v1/products?collection=farm-animals&designStyle=CARTOON`

When creating/updating a product, send `designStyle` and optional `collectionIds` in the product DTO. The IDs must refer to active collections.

## Collection API
- `GET /api/v1/collections` — active collections ordered by sortOrder.
- `GET /api/v1/collections?featured=true` — active featured collections for storefront modules.
- `GET /api/v1/collections/:slug` — collection detail and active products.
- `POST /api/v1/collections` — ADMIN/SUPER_ADMIN.
- `PATCH /api/v1/collections/:id` — ADMIN/SUPER_ADMIN.
- `DELETE /api/v1/collections/:id` — ADMIN/SUPER_ADMIN; archives instead of hard deleting.

Collection fields: name, slug, description, bannerImage, thumbnail, isActive, isFeatured, sortOrder.
A product may belong to multiple collections. The join record stores its position within a collection.

## Homepage CMS collection block
The existing CMS hierarchy remains `CmsPage → CmsSection → CmsBlock`. Use the dedicated `PRODUCT_COLLECTION` block type inside a Homepage section; this is preferable to embedding dynamic product data in `RICH_TEXT`, because the frontend can identify and render a live product collection independently. Set the block content to:

```json
{
  "collectionSlug": "farm-animals",
  "title": "Farm Animal Collection",
  "limit": 8
}
```

The CMS section/block `sortOrder` controls placement; `isVisible` controls visibility. The backend verifies that `collectionSlug` belongs to an existing active collection before saving the page update. Publish the Homepage CMS page to expose the block through the public CMS page endpoint. The storefront renderer should resolve `collectionSlug` using `GET /api/v1/collections/:slug` and render the product cards (applying `limit` in the renderer or API query layer). Dynamic product data is not copied into CMS rich text; CMS stores only the collection reference and presentation settings.

## Migration / validation
After pulling this branch, regenerate Prisma Client and create/apply a migration for the new `DesignStyle` enum, `Product.designStyle`, `Collection`, and `ProductCollection` models. Run Prisma format/validate, client generation, backend build, lint and tests before merging. No migration or local test command is run by this change.
