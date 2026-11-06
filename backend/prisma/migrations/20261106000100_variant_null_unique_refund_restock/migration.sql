-- Keep the existing compound unique index for non-NULL Apliiq colors.
-- PostgreSQL treats NULL values as distinct, so this partial index closes the
-- duplicate-null gap for products that do not have an Apliiq color assigned.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_variants"
    WHERE "apliiqColorId" IS NULL
    GROUP BY "productId", "sizeId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add product variant NULL-color unique index: duplicate (productId, sizeId) rows exist. Resolve duplicates before deploying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "product_variants_productId_sizeId_null_apliiqColorId_key"
  ON "product_variants" ("productId", "sizeId")
  WHERE "apliiqColorId" IS NULL;

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "FulfillmentSubmissionStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUIRED';
ALTER TYPE "FulfillmentSubmissionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "stock_reservations"
  ADD COLUMN "restockedAt" TIMESTAMP(3);

ALTER TABLE "payment_attempts"
  ADD COLUMN "stripeRefundId" TEXT;

CREATE UNIQUE INDEX "payment_attempts_stripeRefundId_key"
  ON "payment_attempts" ("stripeRefundId");
