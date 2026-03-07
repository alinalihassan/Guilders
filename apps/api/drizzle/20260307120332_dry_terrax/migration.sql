ALTER TABLE "transaction" RENAME COLUMN "date" TO "timestamp";--> statement-breakpoint
ALTER INDEX "transaction_date_idx" RENAME TO "transaction_timestamp_idx";--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "timestamp" SET DATA TYPE timestamp with time zone USING "timestamp"::timestamp with time zone;