ALTER TABLE "apikey" DROP CONSTRAINT "apikey_user_id_user_id_fkey";--> statement-breakpoint
DROP INDEX "apikey_userId_idx";--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "reference_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD COLUMN "require_pkce" boolean;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "auth_time" timestamp;--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "currency" SET DATA TYPE text USING "currency"::text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "currency" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" ("reference_id");