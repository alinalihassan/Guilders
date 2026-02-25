CREATE TYPE "account_subtype" AS ENUM('depository', 'brokerage', 'crypto', 'property', 'vehicle', 'creditcard', 'loan', 'stock');--> statement-breakpoint
CREATE TYPE "account_type" AS ENUM('asset', 'liability');--> statement-breakpoint
CREATE TYPE "document_entity_type" AS ENUM('account', 'transaction');--> statement-breakpoint
CREATE TYPE "investable" AS ENUM('non_investable', 'investable_easy_convert', 'investable_cash');--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('unsubscribed', 'trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');--> statement-breakpoint
CREATE TYPE "taxability" AS ENUM('taxable', 'tax_free', 'tax_deferred');--> statement-breakpoint
CREATE TABLE "account" (
	"cost" numeric(19,4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" varchar(3) NOT NULL,
	"documents" varchar(255)[],
	"id" serial PRIMARY KEY,
	"image" varchar(255),
	"institution_connection_id" integer,
	"investable" "investable" DEFAULT 'investable_cash'::"investable" NOT NULL,
	"name" varchar(100) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"parent" integer,
	"provider_account_id" varchar(255),
	"subtype" "account_subtype" NOT NULL,
	"tax_rate" numeric(5,4),
	"taxability" "taxability" DEFAULT 'tax_free'::"taxability" NOT NULL,
	"ticker" varchar(20),
	"type" "account_type" NOT NULL,
	"units" numeric(19,8),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"value" numeric(19,4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"two_factor_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" integer,
	"color" varchar(7) DEFAULT '#64748b',
	"icon" varchar(100),
	"classification" varchar(20) DEFAULT 'expense' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "country" (
	"code" varchar(2) PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"currency_code" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency" (
	"code" varchar(3) PRIMARY KEY,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "document_entity_type" NOT NULL,
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"size" integer NOT NULL,
	"type" varchar(100) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_connection" (
	"id" serial PRIMARY KEY,
	"broken" boolean DEFAULT false NOT NULL,
	"connection_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"institution_id" integer NOT NULL,
	"provider_connection_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" serial PRIMARY KEY,
	"country" varchar(2),
	"enabled" boolean DEFAULT true NOT NULL,
	"logo_url" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider_id" integer NOT NULL,
	"provider_institution_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_connection" (
	"id" serial PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider_id" integer NOT NULL,
	"secret" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider" (
	"id" serial PRIMARY KEY,
	"logo_url" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate" (
	"currency_code" varchar(3) PRIMARY KEY,
	"rate" numeric(19,8) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"account_id" integer NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" varchar(3) NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"documents" varchar(255)[],
	"id" serial PRIMARY KEY,
	"provider_transaction_id" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_setting" (
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"user_id" varchar(255) PRIMARY KEY
);
--> statement-breakpoint
CREATE INDEX "account_id_idx" ON "account" ("id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "account_currency_idx" ON "account" ("currency");--> statement-breakpoint
CREATE INDEX "account_parent_idx" ON "account" ("parent");--> statement-breakpoint
CREATE INDEX "account_institution_connection_idx" ON "account" ("institution_connection_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" ("key");--> statement-breakpoint
CREATE INDEX "apikey_userId_idx" ON "apikey" ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" ("user_id");--> statement-breakpoint
CREATE INDEX "user_account_userId_idx" ON "user_account" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "category_id_idx" ON "category" ("id");--> statement-breakpoint
CREATE INDEX "category_user_idx" ON "category" ("user_id");--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" ("parent_id");--> statement-breakpoint
CREATE INDEX "country_code_idx" ON "country" ("code");--> statement-breakpoint
CREATE INDEX "country_currency_idx" ON "country" ("currency_code");--> statement-breakpoint
CREATE INDEX "currency_code_idx" ON "currency" ("code");--> statement-breakpoint
CREATE INDEX "document_id_idx" ON "document" ("id");--> statement-breakpoint
CREATE INDEX "document_user_idx" ON "document" ("user_id");--> statement-breakpoint
CREATE INDEX "document_entity_idx" ON "document" ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "institution_connection_id_idx" ON "institution_connection" ("id");--> statement-breakpoint
CREATE INDEX "institution_connection_institution_idx" ON "institution_connection" ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_connection_provider_idx" ON "institution_connection" ("provider_connection_id");--> statement-breakpoint
CREATE INDEX "institution_id_idx" ON "institution" ("id");--> statement-breakpoint
CREATE INDEX "institution_provider_idx" ON "institution" ("provider_id");--> statement-breakpoint
CREATE INDEX "institution_country_idx" ON "institution" ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "institution_provider_provider_institution_unique" ON "institution" ("provider_id","provider_institution_id");--> statement-breakpoint
CREATE INDEX "provider_connection_id_idx" ON "provider_connection" ("id");--> statement-breakpoint
CREATE INDEX "provider_connection_user_idx" ON "provider_connection" ("user_id");--> statement-breakpoint
CREATE INDEX "provider_connection_provider_idx" ON "provider_connection" ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_id_idx" ON "provider" ("id");--> statement-breakpoint
CREATE INDEX "rate_currency_idx" ON "rate" ("currency_code");--> statement-breakpoint
CREATE INDEX "transaction_id_idx" ON "transaction" ("id");--> statement-breakpoint
CREATE INDEX "transaction_account_idx" ON "transaction" ("account_id");--> statement-breakpoint
CREATE INDEX "transaction_category_idx" ON "transaction" ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_currency_idx" ON "transaction" ("currency");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "transaction" ("date");--> statement-breakpoint
CREATE INDEX "user_setting_user_idx" ON "user_setting" ("user_id");--> statement-breakpoint
CREATE INDEX "user_setting_currency_idx" ON "user_setting" ("currency");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_currency_currency_code_fkey" FOREIGN KEY ("currency") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_ok0j2ud8i0Kr_fkey" FOREIGN KEY ("institution_connection_id") REFERENCES "institution_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_currency_code_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "institution_connection" ADD CONSTRAINT "institution_connection_institution_id_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "institution_connection" ADD CONSTRAINT "institution_connection_Jy4P5KZYFGDz_fkey" FOREIGN KEY ("provider_connection_id") REFERENCES "provider_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_country_country_code_fkey" FOREIGN KEY ("country") REFERENCES "country"("code");--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_provider_id_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD CONSTRAINT "provider_connection_provider_id_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD CONSTRAINT "provider_connection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_currency_code_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_currency_currency_code_fkey" FOREIGN KEY ("currency") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_currency_currency_code_fkey" FOREIGN KEY ("currency") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;