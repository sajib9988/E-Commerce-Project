CREATE TABLE "oauth_accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_agent" TEXT,
  "ip_address" TEXT,
  CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key"
  ON "oauth_accounts"("provider", "provider_account_id");
CREATE UNIQUE INDEX "oauth_accounts_user_id_provider_key"
  ON "oauth_accounts"("user_id", "provider");
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");
CREATE INDEX "refresh_sessions_user_id_revoked_at_idx" ON "refresh_sessions"("user_id", "revoked_at");
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");

ALTER TABLE "oauth_accounts"
  ADD CONSTRAINT "oauth_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_sessions"
  ADD CONSTRAINT "refresh_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
