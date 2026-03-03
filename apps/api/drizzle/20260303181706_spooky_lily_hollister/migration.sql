CREATE TABLE "conversation" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"title" varchar(200) DEFAULT 'New chat' NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "conversation_user_idx" ON "conversation" ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_updated_idx" ON "conversation" ("updated_at");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;