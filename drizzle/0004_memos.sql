-- 習慣・カテゴリを消してもメモは残す。複合外部キーの ON DELETE SET NULL は列を指定する
-- （指定しないと user_id まで NULL にしようとして失敗する。PostgreSQL 15 以降）。drizzle-kit は
-- 列の指定を出力できないので、この3つの外部キーは手で直している
CREATE TABLE "memo_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"prompt" text,
	"daily_target" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memo_categories_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "memo_categories_daily_target_positive" CHECK ("memo_categories"."daily_target" is null or "memo_categories"."daily_target" > 0)
);
--> statement-breakpoint
CREATE TABLE "memo_drafts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"category_id" uuid,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"body" text NOT NULL,
	"category_id" uuid,
	"habit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memos_body_not_empty" CHECK (length("memos"."body") > 0),
	CONSTRAINT "memos_category_or_habit" CHECK ("memos"."category_id" is null or "memos"."habit_id" is null)
);
--> statement-breakpoint
ALTER TABLE "memo_categories" ADD CONSTRAINT "memo_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_drafts" ADD CONSTRAINT "memo_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_drafts" ADD CONSTRAINT "memo_drafts_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."memo_categories"("id","user_id") ON DELETE set null ("category_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."memo_categories"("id","user_id") ON DELETE set null ("category_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_habit_fk" FOREIGN KEY ("habit_id","user_id") REFERENCES "public"."habits"("id","user_id") ON DELETE set null ("habit_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memo_categories_user_idx" ON "memo_categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memos_habit_date_unique" ON "memos" USING btree ("habit_id","date") WHERE "memos"."habit_id" is not null;--> statement-breakpoint
CREATE INDEX "memos_user_date_idx" ON "memos" USING btree ("user_id","date","created_at");--> statement-breakpoint
CREATE INDEX "memos_user_category_date_idx" ON "memos" USING btree ("user_id","category_id","date");
--> statement-breakpoint
-- 記録へのひとこと（entry_notes）を memos の習慣へのひとことに移す。entry_notes は 0005 で消す
INSERT INTO "memos" ("id", "user_id", "date", "body", "habit_id", "created_at", "updated_at")
SELECT "id", "user_id", "date", "body", "habit_id", "created_at", "updated_at" FROM "entry_notes";
