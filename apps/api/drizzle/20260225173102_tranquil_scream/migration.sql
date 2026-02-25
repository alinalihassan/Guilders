ALTER TABLE "account" ADD COLUMN "locked_attributes" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "locked_attributes" jsonb DEFAULT '{}' NOT NULL;