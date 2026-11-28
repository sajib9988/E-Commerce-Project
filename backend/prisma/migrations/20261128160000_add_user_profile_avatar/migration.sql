ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT, ADD COLUMN "avatarPublicId" TEXT, ADD COLUMN "passwordEnabled" BOOLEAN NOT NULL DEFAULT true;
