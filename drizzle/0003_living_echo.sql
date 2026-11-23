-- entry_notes の複合外部キーより先に、参照先の一意制約を作る
ALTER TABLE "habits" ADD CONSTRAINT "habits_id_user_unique" UNIQUE("id","user_id");--> statement-breakpoint
CREATE TABLE "entry_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_notes_habit_date_unique" UNIQUE("habit_id","date"),
	CONSTRAINT "entry_notes_body_not_empty" CHECK (length("entry_notes"."body") > 0)
);
--> statement-breakpoint
ALTER TABLE "entry_notes" ADD CONSTRAINT "entry_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_notes" ADD CONSTRAINT "entry_notes_habit_fk" FOREIGN KEY ("habit_id","user_id") REFERENCES "public"."habits"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_notes_user_date_idx" ON "entry_notes" USING btree ("user_id","date");--> statement-breakpoint
