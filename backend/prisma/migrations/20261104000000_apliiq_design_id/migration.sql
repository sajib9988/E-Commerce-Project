ALTER TABLE "products" ADD COLUMN "apliiqDesignId" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "colorName" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "colorHex" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "apliiqColorId" TEXT;
DROP INDEX "product_variants_productId_sizeId_key";
CREATE UNIQUE INDEX "product_variants_productId_sizeId_apliiqColorId_key"
  ON "product_variants"("productId", "sizeId", "apliiqColorId");
CREATE INDEX "product_variants_productId_apliiqColorId_idx"
  ON "product_variants"("productId", "apliiqColorId");
