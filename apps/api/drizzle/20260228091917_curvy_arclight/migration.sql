CREATE TABLE "balance_snapshot" (
	"id" serial PRIMARY KEY,
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"balance" numeric(19,4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "balance_snapshot_account_idx" ON "balance_snapshot" ("account_id");--> statement-breakpoint
CREATE INDEX "balance_snapshot_date_idx" ON "balance_snapshot" ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "balance_snapshot_account_date_idx" ON "balance_snapshot" ("account_id","date");--> statement-breakpoint
ALTER TABLE "balance_snapshot" ADD CONSTRAINT "balance_snapshot_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "balance_snapshot" ADD CONSTRAINT "balance_snapshot_currency_currency_code_fkey" FOREIGN KEY ("currency") REFERENCES "currency"("code");