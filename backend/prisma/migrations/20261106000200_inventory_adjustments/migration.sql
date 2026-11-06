CREATE TABLE "inventory_adjustments" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "actorId" TEXT NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "quantityBefore" INTEGER NOT NULL,
  "quantityAfter" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_adjustments_exactly_one_target_check" CHECK (("productId" IS NOT NULL AND "variantId" IS NULL) OR ("productId" IS NULL AND "variantId" IS NOT NULL)),
  CONSTRAINT "inventory_adjustments_quantity_check" CHECK ("quantityAfter" >= 0 AND "quantityBefore" >= 0 AND "quantityAfter" - "quantityBefore" = "quantityDelta")
);
CREATE INDEX "inventory_adjustments_productId_createdAt_idx" ON "inventory_adjustments"("productId", "createdAt");
CREATE INDEX "inventory_adjustments_variantId_createdAt_idx" ON "inventory_adjustments"("variantId", "createdAt");
CREATE INDEX "inventory_adjustments_actorId_createdAt_idx" ON "inventory_adjustments"("actorId", "createdAt");
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;