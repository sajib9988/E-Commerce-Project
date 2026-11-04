CREATE TABLE "product_artworks" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "imagePublicId" TEXT,
  "apliiqArtworkId" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_artworks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_artworks_apliiqArtworkId_key" ON "product_artworks"("apliiqArtworkId");
CREATE INDEX "product_artworks_productId_isPrimary_idx" ON "product_artworks"("productId", "isPrimary");
ALTER TABLE "product_artworks" ADD CONSTRAINT "product_artworks_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "product_artworks" (
  "id", "productId", "name", "imageUrl", "imagePublicId", "apliiqArtworkId",
  "isPrimary", "createdAt", "updatedAt"
)
SELECT
  'legacy-artwork-' || "id", "id", LEFT("name", 50), "imageUrl", "imagePublicId",
  "apliiqArtworkId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "products"
WHERE "apliiqArtworkId" IS NOT NULL;

ALTER TABLE "products" DROP COLUMN "apliiqArtworkId";

CREATE TABLE "product_artwork_placements" (
  "id" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "printColors" TEXT,
  "boxId" INTEGER,
  "note" TEXT,
  "widthInches" DECIMAL(6,2),
  "heightInches" DECIMAL(6,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_artwork_placements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_artwork_placements_artworkId_idx" ON "product_artwork_placements"("artworkId");
ALTER TABLE "product_artwork_placements" ADD CONSTRAINT "product_artwork_placements_artworkId_fkey"
  FOREIGN KEY ("artworkId") REFERENCES "product_artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "apliiq_product_designs" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "colorId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "apliiqDesignId" TEXT NOT NULL,
  "mockupUrl" TEXT,
  "mockupUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "providerPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "apliiq_product_designs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "apliiq_product_designs_productId_colorId_key" ON "apliiq_product_designs"("productId", "colorId");
CREATE INDEX "apliiq_product_designs_apliiqDesignId_idx" ON "apliiq_product_designs"("apliiqDesignId");
ALTER TABLE "apliiq_product_designs" ADD CONSTRAINT "apliiq_product_designs_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
