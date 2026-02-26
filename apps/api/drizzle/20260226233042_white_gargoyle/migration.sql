DROP TABLE "user_setting";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "currency" varchar(3) DEFAULT 'EUR' NOT NULL;