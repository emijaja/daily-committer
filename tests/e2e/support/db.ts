/**
 * E2E 用のデータを DB に直接作る・消す関数。
 * アプリの src/db/client.ts は "server-only" のため使わず、ここで別の接続を持つ。
 * テーブルの定義（src/db/schema.ts）と日付の計算（src/domain/date.ts）はアプリのものを使う。
 */
import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../src/db/schema";
import {
  entries,
  habits,
  session,
  user,
  userSettings,
} from "../../../src/db/schema";
import { toLogicalDate } from "../../../src/domain/date";
import type { LogicalDate } from "../../../src/domain/types";
import { e2eDatabaseUrl } from "./env";

let pool: Pool | undefined;

function db() {
  pool ??= new Pool({ connectionString: e2eDatabaseUrl(), max: 2 });
  return drizzle(pool, { schema });
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/**
 * いまのローカル時刻がおよそ正午になるタイムゾーン（Etc/GMT±N）。
 * テストの途中で「1日の切り替え」（既定 4:00）や日付の変わり目をまたがないようにするため、
 * ユーザーごとにこのタイムゾーンを設定する。Etc/GMT の符号は UTC との差と逆になる（Etc/GMT-9 は UTC+9）。
 * 差が 0 のときは "UTC" にする（ブラウザは Etc/GMT を UTC として返すので、保存される値と揃える）。
 */
export function middayTimezone(now: Date = new Date()): string {
  const offset = 12 - now.getUTCHours(); // -11〜+12
  if (offset === 0) return "UTC";
  return offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

export interface TestUserOptions {
  /** オンボーディングを終えているか（既定 true） */
  onboarded?: boolean;
  /** 既定は middayTimezone() */
  timezone?: string;
  dayStartHour?: number;
  weekStart?: "mon" | "sun";
}

export interface TestUser {
  id: string;
  email: string;
  timezone: string;
  dayStartHour: number;
  /** セッションのトークン（署名前の値） */
  sessionToken: string;
}

/** ユーザー・設定・セッションを作る */
export async function createTestUser(
  options: TestUserOptions = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = `e2e-${id}@example.com`;
  const timezone = options.timezone ?? middayTimezone();
  const dayStartHour = options.dayStartHour ?? 4;
  const sessionToken = randomBytes(24).toString("base64url");
  const conn = db();
  await conn.insert(user).values({ id, name: "E2E テスト", email });
  await conn.insert(userSettings).values({
    userId: id,
    timezone,
    dayStartHour,
    weekStart: options.weekStart ?? "mon",
    onboardedAt: (options.onboarded ?? true) ? new Date() : null,
  });
  await conn.insert(session).values({
    id: randomUUID(),
    userId: id,
    token: sessionToken,
    // Better Auth の既定（expiresIn 7日）と同じにする。短いと作った直後から
    // 「更新が必要なセッション」になり、読むたびに更新と Set-Cookie が走る
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { id, email, timezone, dayStartHour, sessionToken };
}

/** ユーザーを消す（外部キーの CASCADE で設定・習慣・記録・セッションも消える） */
export async function deleteTestUsers(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await db()
    .delete(user)
    .where(inArray(user.id, [...ids]));
}

/** そのユーザーの「今日」（サーバーと同じ計算） */
export function todayOf(
  testUser: Pick<TestUser, "timezone" | "dayStartHour">,
): LogicalDate {
  return toLogicalDate(new Date(), testUser.timezone, testUser.dayStartHour);
}

type HabitInsert = Omit<typeof habits.$inferInsert, "userId" | "id">;

export interface HabitInput {
  name: string;
  period?: "daily" | "weekly" | "monthly";
  /** 量の習慣にするときに指定する */
  quantity?: {
    unit: string;
    target: number | null;
    mode: "total" | "increment";
  };
  /** 週次・月次のチェックのみの習慣の回数の目標 */
  timesPerPeriod?: number;
  createdOn: LogicalDate;
  sortOrder?: number;
}

export async function createHabit(
  userId: string,
  input: HabitInput,
): Promise<string> {
  const period = input.period ?? "daily";
  const values: HabitInsert = {
    name: input.name,
    note: null,
    period,
    recordType: input.quantity ? "quantity" : "check",
    timesPerPeriod: input.quantity
      ? null
      : period === "daily"
        ? null
        : (input.timesPerPeriod ?? 1),
    unit: input.quantity?.unit ?? null,
    quantityTarget: input.quantity?.target ?? null,
    inputMode: input.quantity?.mode ?? null,
    createdOn: input.createdOn,
    sortOrder: input.sortOrder ?? 0,
  };
  const [row] = await db()
    .insert(habits)
    .values({ ...values, userId })
    .returning({ id: habits.id });
  if (!row) throw new Error("習慣を作れませんでした");
  return row.id;
}

export async function createEntry(
  userId: string,
  habitId: string,
  date: LogicalDate,
  quantity: number | null = null,
): Promise<void> {
  const [habit] = await db()
    .select({ multiplePerDay: habits.multiplePerDay })
    .from(habits)
    .where(eq(habits.id, habitId));
  if (!habit) throw new Error("習慣が見つかりません");
  await db().insert(entries).values({
    userId,
    habitId,
    date,
    quantity,
    multiplePerDay: habit.multiplePerDay,
  });
}

/** そのユーザーの記録（日付の古い順） */
export async function entriesOf(userId: string) {
  return db()
    .select({
      habitId: entries.habitId,
      date: entries.date,
      quantity: entries.quantity,
    })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(entries.date, entries.createdAt);
}

export async function habitsOf(userId: string) {
  return db()
    .select({ id: habits.id, name: habits.name, period: habits.period })
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(habits.sortOrder);
}

export async function settingsOf(userId: string) {
  const [row] = await db()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row;
}
