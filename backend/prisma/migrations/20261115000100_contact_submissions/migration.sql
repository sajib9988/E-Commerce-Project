CREATE TYPE "contact_status" AS ENUM ('NEW', 'READ', 'RESOLVED');

CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "contact_status" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_submissions_status_createdAt_idx"
ON "contact_submissions"("status", "createdAt");

CREATE INDEX "contact_submissions_email_idx"
ON "contact_submissions"("email");
