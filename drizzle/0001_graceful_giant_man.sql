ALTER TABLE "entries" DROP CONSTRAINT "entries_habit_id_habits_id_fk";
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "multiple_per_day" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "multiple_per_day" boolean GENERATED ALWAYS AS (input_mode is not distinct from 'increment') STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_id_user_multiple_unique" UNIQUE("id","user_id","multiple_per_day");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_habit_fk" FOREIGN KEY ("habit_id","user_id","multiple_per_day") REFERENCES "public"."habits"("id","user_id","multiple_per_day") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_habit_date_single_unique" ON "entries" USING btree ("habit_id","date") WHERE not "entries"."multiple_per_day";