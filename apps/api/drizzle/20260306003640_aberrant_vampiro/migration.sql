CREATE TABLE "webhook" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webhooks_user_id_idx" ON "webhook" ("user_id");--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;