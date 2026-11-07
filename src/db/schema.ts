/** アプリのテーブル。仕様は docs/web/domain-spec.md 2章 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
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
    /**
     * 1日に複数の記録を持てるか（「回ごとに足す」の習慣だけ true）。input_mode から DB が計算する。
     * entries の一意制約に使う（entries.multiple_per_day を参照）
     */
    multiplePerDay: boolean("multiple_per_day")
      .notNull()
      .generatedAlwaysAs(sql`input_mode is not distinct from 'increment'`),
    createdAt: createdAt(),
  },
  (t) => [
    index("habits_user_idx").on(t.userId, t.archivedOn),
    // entries からの複合外部キーの参照先
    unique("habits_id_user_multiple_unique").on(
      t.id,
      t.userId,
      t.multiplePerDay,
    ),
    check(
      "quantity_fields",
      sql`(${t.recordType} = 'check' and ${t.unit} is null and ${t.quantityTarget} is null and ${t.inputMode} is null)
       or (${t.recordType} = 'quantity' and ${t.unit} is not null and ${t.inputMode} is not null and ${t.timesPerPeriod} is null)`,
    ),
    // 回数の目標は週次・月次のチェックのみの習慣だけが持ち、その場合は必須（domain-spec.md 2章・4章）
    check(
      "times_per_period_scope",
      sql`(${t.recordType} = 'check' and ${t.period} <> 'daily' and ${t.timesPerPeriod} is not null and ${t.timesPerPeriod} > 0)
       or ((${t.recordType} = 'quantity' or ${t.period} = 'daily') and ${t.timesPerPeriod} is null)`,
    ),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id").notNull(),
    userId: userId(),
    /**
     * 習慣の multiple_per_day の写し。記録を作るときは習慣と同じ値を入れる
     * （違うと外部キーで弾かれる）。習慣の入力のしかたが変わると自動で追従する。
     */
    multiplePerDay: boolean("multiple_per_day").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }),
    createdAt: createdAt(),
  },
  (t) => [
    // 記録の user_id と習慣の持ち主が必ず一致するようにする（他人の習慣に記録を付けられない）
    foreignKey({
      name: "entries_habit_fk",
      columns: [t.habitId, t.userId, t.multiplePerDay],
      foreignColumns: [habits.id, habits.userId, habits.multiplePerDay],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    // チェックのみ・合計を入力の習慣は1日1行（domain-spec.md 2章）。
    // 同時に2回押されても2行にならず、upsert の衝突先にも使える
    uniqueIndex("entries_habit_date_single_unique")
      .on(t.habitId, t.date)
      .where(sql`not ${t.multiplePerDay}`),
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
