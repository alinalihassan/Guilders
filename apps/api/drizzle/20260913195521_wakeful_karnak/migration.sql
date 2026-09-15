CREATE TABLE "rule" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"payee_enabled" boolean DEFAULT false NOT NULL,
	"payee_match" varchar(20),
	"payee_value" text,
	"amount_enabled" boolean DEFAULT false NOT NULL,
	"amount_kind" varchar(20),
	"amount_compare" varchar(20),
	"amount_value" numeric(19,4),
	"amount_value_max" numeric(19,4),
	"set_category_id" integer,
	"rename_merchant" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_account" (
	"rule_id" integer,
	"account_id" integer,
	CONSTRAINT "rule_account_pkey" PRIMARY KEY("rule_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "rule_tag" (
	"rule_id" integer,
	"tag_id" integer,
	CONSTRAINT "rule_tag_pkey" PRIMARY KEY("rule_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tag" (
	"transaction_id" integer,
	"tag_id" integer,
	CONSTRAINT "transaction_tag_pkey" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "rule_user_idx" ON "rule" ("user_id");--> statement-breakpoint
CREATE INDEX "rule_user_position_idx" ON "rule" ("user_id","position");--> statement-breakpoint
CREATE INDEX "rule_account_account_idx" ON "rule_account" ("account_id");--> statement-breakpoint
CREATE INDEX "rule_tag_tag_idx" ON "rule_tag" ("tag_id");--> statement-breakpoint
CREATE INDEX "tag_user_idx" ON "tag" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_user_name_unique" ON "tag" ("user_id","name");--> statement-breakpoint
CREATE INDEX "transaction_tag_tag_idx" ON "transaction_tag" ("tag_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_country_country_code_fkey" FOREIGN KEY ("country") REFERENCES "country"("code");--> statement-breakpoint
ALTER TABLE "rule" ADD CONSTRAINT "rule_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rule" ADD CONSTRAINT "rule_set_category_id_category_id_fkey" FOREIGN KEY ("set_category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_account" ADD CONSTRAINT "rule_account_rule_id_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_account" ADD CONSTRAINT "rule_account_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_tag" ADD CONSTRAINT "rule_tag_rule_id_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_tag" ADD CONSTRAINT "rule_tag_tag_id_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_tag_id_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;