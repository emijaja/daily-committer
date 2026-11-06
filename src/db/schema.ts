/** アプリのテーブル。仕様は docs/web/domain-spec.md 2章 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const periodEnum = pgEnum("period", ["daily", "weekly", "monthly"]);
export const recordTypeEnum = pgEnum("record_type", ["check", "quantity"]);
export const inputModeEnum = pgEnum("input_mode", ["total", "increment"]);
export const weekStartEnum = pgEnum("week_start", ["mon", "sun"]);

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userSettings = pgTable(
  "user_settings",
  {
    userId: userId().primaryKey(),
    timezone: text("timezone").notNull().default("Asia/Tokyo"),
    weekStart: weekStartEnum("week_start").notNull().default("mon"),
    dayStartHour: smallint("day_start_hour").notNull().default(4),
    grumbleEnabled: boolean("grumble_enabled").notNull().default(true),
    grumblePush: boolean("grumble_push").notNull().default(false),
    reminderTime: time("reminder_time"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("day_start_hour_range", sql`${t.dayStartHour} between 0 and 6`),
  ],
);

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    note: text("note"),
    period: periodEnum("period").notNull(),
    recordType: recordTypeEnum("record_type").notNull(),
    timesPerPeriod: integer("times_per_period"),
    unit: text("unit"),
    quantityTarget: numeric("quantity_target", {
      precision: 12,
      scale: 3,
      mode: "number",
    }),
    inputMode: inputModeEnum("input_mode"),
    /** 習慣を作った日（ユーザーの1日の日付） */
    createdOn: date("created_on", { mode: "string" }).notNull(),
    /** 過去の習慣にした日。null なら現在の習慣 */
    archivedOn: date("archived_on", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("habits_user_idx").on(t.userId, t.archivedOn),
    check(
      "quantity_fields",
      sql`(${t.recordType} = 'check' and ${t.unit} is null and ${t.quantityTarget} is null and ${t.inputMode} is null)
       or (${t.recordType} = 'quantity' and ${t.unit} is not null and ${t.inputMode} is not null and ${t.timesPerPeriod} is null)`,
    ),
    check(
      "times_per_period_scope",
      sql`${t.timesPerPeriod} is null or (${t.period} <> 'daily' and ${t.timesPerPeriod} > 0)`,
    ),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: userId(),
    date: date("date", { mode: "string" }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("entries_user_date_idx").on(t.userId, t.date),
    index("entries_habit_date_idx").on(t.habitId, t.date),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);
