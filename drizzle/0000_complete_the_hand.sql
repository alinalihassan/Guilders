CREATE TYPE "public"."account_subtype" AS ENUM('depository', 'brokerage', 'crypto', 'property', 'vehicle', 'creditcard', 'loan', 'stock');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."document_entity_type" AS ENUM('account', 'transaction');--> statement-breakpoint
CREATE TYPE "public"."investable" AS ENUM('non_investable', 'investable_easy_convert', 'investable_cash');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('unsubscribed', 'trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');--> statement-breakpoint
CREATE TYPE "public"."taxability" AS ENUM('taxable', 'tax_free', 'tax_deferred');--> statement-breakpoint
CREATE TABLE "asset" (
	"cost" numeric(19, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" varchar(3) NOT NULL,
	"documents" varchar(255)[],
	"id" serial PRIMARY KEY NOT NULL,
	"image" varchar(255),
	"institution_connection_id" integer,
	"investable" "investable" DEFAULT 'investable_cash' NOT NULL,
	"name" varchar(100) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"parent" integer,
	"provider_account_id" varchar(255),
	"subtype" "account_subtype" NOT NULL,
	"tax_rate" numeric(5, 4),
	"taxability" "taxability" DEFAULT 'tax_free' NOT NULL,
	"ticker" varchar(20),
	"type" "account_type" NOT NULL,
	"units" numeric(19, 8),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"value" numeric(19, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "country" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"country" varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "document_entity_type" NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"size" integer NOT NULL,
	"type" varchar(100) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_connection" (
	"id" serial PRIMARY KEY NOT NULL,
	"broken" boolean DEFAULT false NOT NULL,
	"connection_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"institution_id" integer NOT NULL,
	"provider_connection_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" serial PRIMARY KEY NOT NULL,
	"country" varchar(2),
	"enabled" boolean DEFAULT true NOT NULL,
	"logo_url" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider_id" integer NOT NULL,
	"provider_institution_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_connection" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider_id" integer NOT NULL,
	"secret" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider" (
	"id" serial PRIMARY KEY NOT NULL,
	"logo_url" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate" (
	"currency_code" varchar(3) PRIMARY KEY NOT NULL,
	"rate" numeric(19, 8) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"cancel_at" timestamp,
	"cancel_at_period_end" boolean,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"ended_at" timestamp,
	"id" serial PRIMARY KEY NOT NULL,
	"status" "subscription_status",
	"stripe_customer_id" varchar(255) NOT NULL,
	"trial_end" timestamp,
	"trial_start" timestamp,
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"asset_id" integer NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"category" varchar(100) DEFAULT 'uncategorized' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" varchar(3) NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"documents" varchar(255)[],
	"id" serial PRIMARY KEY NOT NULL,
	"provider_transaction_id" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_setting" (
	"api_key" varchar(255),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"profile_url" varchar(255),
	"user_id" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_currency_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_institution_connection_id_institution_connection_id_fk" FOREIGN KEY ("institution_connection_id") REFERENCES "public"."institution_connection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency" ADD CONSTRAINT "currency_country_country_code_fk" FOREIGN KEY ("country") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_connection" ADD CONSTRAINT "institution_connection_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_connection" ADD CONSTRAINT "institution_connection_provider_connection_id_provider_connection_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_country_country_code_fk" FOREIGN KEY ("country") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_provider_id_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD CONSTRAINT "provider_connection_provider_id_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_currency_code_currency_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_currency_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_currency_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_id_idx" ON "asset" USING btree ("id");--> statement-breakpoint
CREATE INDEX "asset_user_idx" ON "asset" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_currency_idx" ON "asset" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "asset_parent_idx" ON "asset" USING btree ("parent");--> statement-breakpoint
CREATE INDEX "asset_institution_connection_idx" ON "asset" USING btree ("institution_connection_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "country_code_idx" ON "country" USING btree ("code");--> statement-breakpoint
CREATE INDEX "currency_code_idx" ON "currency" USING btree ("code");--> statement-breakpoint
CREATE INDEX "currency_country_idx" ON "currency" USING btree ("country");--> statement-breakpoint
CREATE INDEX "document_id_idx" ON "document" USING btree ("id");--> statement-breakpoint
CREATE INDEX "document_user_idx" ON "document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_entity_idx" ON "document" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "institution_connection_id_idx" ON "institution_connection" USING btree ("id");--> statement-breakpoint
CREATE INDEX "institution_connection_institution_idx" ON "institution_connection" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_connection_provider_idx" ON "institution_connection" USING btree ("provider_connection_id");--> statement-breakpoint
CREATE INDEX "institution_id_idx" ON "institution" USING btree ("id");--> statement-breakpoint
CREATE INDEX "institution_provider_idx" ON "institution" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "institution_country_idx" ON "institution" USING btree ("country");--> statement-breakpoint
CREATE INDEX "provider_connection_id_idx" ON "provider_connection" USING btree ("id");--> statement-breakpoint
CREATE INDEX "provider_connection_user_idx" ON "provider_connection" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "provider_connection_provider_idx" ON "provider_connection" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_id_idx" ON "provider" USING btree ("id");--> statement-breakpoint
CREATE INDEX "rate_currency_idx" ON "rate" USING btree ("currency_code");--> statement-breakpoint
CREATE INDEX "subscription_id_idx" ON "subscription" USING btree ("id");--> statement-breakpoint
CREATE INDEX "subscription_user_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_customer_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "transaction_id_idx" ON "transaction" USING btree ("id");--> statement-breakpoint
CREATE INDEX "transaction_asset_idx" ON "transaction" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "transaction_currency_idx" ON "transaction" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "transaction" USING btree ("date");--> statement-breakpoint
CREATE INDEX "user_setting_user_idx" ON "user_setting" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_setting_currency_idx" ON "user_setting" USING btree ("currency");