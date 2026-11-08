/** 統合テスト用のデータを DB に直接作る関数 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { entries, user, userSettings } from "@/db/schema";
import type { LogicalDate } from "@/domain/types";
import { insertHabits, type HabitValues } from "@/server/repositories/habits";

export const d = (value: string) => value as LogicalDate;

export async function createUser(
  settings: Partial<typeof userSettings.$inferInsert> = {},
): Promise<string> {
  const id = randomUUID();
  await db
    .insert(user)
    .values({ id, name: "テスト", email: `${id}@example.com` });
  await db.insert(userSettings).values({ ...settings, userId: id });
  return id;
}

const base: HabitValues = {
  name: "読書",
  note: null,
  period: "daily",
  recordType: "check",
  timesPerPeriod: null,
  unit: null,
  quantityTarget: null,
  inputMode: null,
};

export const checkHabit = (
  overrides: Partial<HabitValues> = {},
): HabitValues => ({
  ...base,
  ...overrides,
});

export const totalHabit = (
  overrides: Partial<HabitValues> = {},
): HabitValues => ({
  ...base,
  name: "筋トレ",
  recordType: "quantity",
  unit: "回",
  quantityTarget: 30,
  inputMode: "total",
  ...overrides,
});

export const incrementHabit = (
  overrides: Partial<HabitValues> = {},
): HabitValues => ({
  ...base,
  name: "ランニング",
  period: "weekly",
  recordType: "quantity",
  unit: "km",
  quantityTarget: 10,
  inputMode: "increment",
  ...overrides,
});

export async function createHabit(
  userId: string,
  values: HabitValues = checkHabit(),
  extra: { createdOn?: string; sortOrder?: number } = {},
): Promise<string> {
  const [created] = await insertHabits(db, userId, [
    {
      ...values,
      createdOn: d(extra.createdOn ?? "2024-10-01"),
      sortOrder: extra.sortOrder ?? 0,
    },
  ]);
  if (!created) throw new Error("習慣を作れませんでした");
  return created.id;
}

/** その習慣の記録（日付の古い順） */
export async function entriesOf(habitId: string) {
  return db
    .select({ id: entries.id, date: entries.date, quantity: entries.quantity })
    .from(entries)
    .where(eq(entries.habitId, habitId))
    .orderBy(entries.date, entries.createdAt);
}
