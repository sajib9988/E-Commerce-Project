CREATE TYPE "PromotionType" AS ENUM ('AUTOMATIC', 'POPUP', 'VOLUME', 'FREE_SHIPPING');
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

ALTER TABLE "coupons"
ADD COLUMN "assigned_email" VARCHAR(320);

CREATE INDEX "coupons_assigned_email_idx"
ON "coupons"("assigned_email");

CREATE TABLE "promotions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PromotionType" NOT NULL,
  "discountType" "PromotionDiscountType",
  "discountValue" DECIMAL(10,2),
  "couponRequired" BOOLEAN NOT NULL DEFAULT false,
  "isSignupOffer" BOOLEAN NOT NULL DEFAULT false,
  "bannerImage" TEXT,
  "title" TEXT,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_type_isActive_startsAt_endsAt_idx"
ON "promotions"("type", "isActive", "startsAt", "endsAt");

CREATE INDEX "promotions_isSignupOffer_isActive_startsAt_endsAt_idx"
ON "promotions"("isSignupOffer", "isActive", "startsAt", "endsAt");

CREATE TABLE "newsletter_subscriptions" (
  "id" TEXT NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "welcomeCouponId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscriptions_email_key"
ON "newsletter_subscriptions"("email");

CREATE UNIQUE INDEX "newsletter_subscriptions_welcomeCouponId_key"
ON "newsletter_subscriptions"("welcomeCouponId");

CREATE INDEX "newsletter_subscriptions_marketingConsent_unsubscribedAt_idx"
ON "newsletter_subscriptions"("marketingConsent", "unsubscribedAt");

ALTER TABLE "newsletter_subscriptions"
ADD CONSTRAINT "newsletter_subscriptions_welcomeCouponId_fkey"
FOREIGN KEY ("welcomeCouponId") REFERENCES "coupons"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
