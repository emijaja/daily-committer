/**
 * habits テーブルの読み書き。すべての関数は userId で絞り、他人の行には触れない。
 */
import "server-only";
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  sql,
} from "drizzle-orm";
import { habits } from "@/db/schema";
import type { Habit, LogicalDate } from "@/domain/types";
import { isUuid, type Executor } from "./types";

type HabitRow = typeof habits.$inferSelect;

/** domain の Habit に、記録の書き込みに必要な multiplePerDay を足したもの */
export interface HabitRecord extends Habit {
  multiplePerDay: boolean;
}

/** 習慣を作る・書き換えるときに書く列 */
export interface HabitValues {
  name: string;
  note: string | null;
  period: Habit["period"];
  recordType: Habit["recordType"];
  timesPerPeriod: number | null;
  unit: string | null;
  quantityTarget: number | null;
  inputMode: Habit["inputMode"];
}

function toHabitRecord(row: HabitRow): HabitRecord {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    period: row.period,
    recordType: row.recordType,
    timesPerPeriod: row.timesPerPeriod,
    unit: row.unit,
    quantityTarget: row.quantityTarget,
    inputMode: row.inputMode,
    createdOn: row.createdOn as LogicalDate,
    archivedOn: row.archivedOn as LogicalDate | null,
    sortOrder: row.sortOrder,
    multiplePerDay: row.multiplePerDay,
  };
}

/** HabitRecord から domain の Habit だけを取り出す（画面に渡す値） */
export function toHabit(record: HabitRecord): Habit {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { multiplePerDay, ...habit } = record;
  return habit;
}

const ordering = [asc(habits.sortOrder), asc(habits.createdAt), asc(habits.id)];

export async function listHabits(
  exec: Executor,
  userId: string,
  status: "active" | "archived" | "all" = "all",
): Promise<HabitRecord[]> {
  const conditions = [eq(habits.userId, userId)];
  if (status === "active") conditions.push(isNull(habits.archivedOn));
  if (status === "archived") conditions.push(isNotNull(habits.archivedOn));
  const rows = await exec
    .select()
    .from(habits)
    .where(and(...conditions))
    .orderBy(...ordering);
  return rows.map(toHabitRecord);
}

export async function countHabits(
  exec: Executor,
  userId: string,
): Promise<{ active: number; archived: number }> {
  const rows = await exec
    .select({
      archived: sql<boolean>`${habits.archivedOn} is not null`,
      n: count(),
    })
    .from(habits)
    .where(eq(habits.userId, userId))
    .groupBy(sql`${habits.archivedOn} is not null`);
  const result = { active: 0, archived: 0 };
  for (const row of rows) {
    if (row.archived) result.archived = row.n;
    else result.active = row.n;
  }
  return result;
}

/**
 * 自分の習慣を1件取得する。他人の習慣・存在しない ID なら null。
 * forUpdate を付けると、トランザクションの終わりまで行をロックする。
 */
export async function findHabit(
  exec: Executor,
  userId: string,
  habitId: string,
  options: { forUpdate?: boolean } = {},
): Promise<HabitRecord | null> {
  if (!isUuid(habitId)) return null;
  const query = exec
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  const rows = options.forUpdate ? await query.for("update") : await query;
  return rows[0] ? toHabitRecord(rows[0]) : null;
}

/** 次に追加する習慣の並び順（いちばん後ろ） */
export async function nextSortOrder(
  exec: Executor,
  userId: string,
): Promise<number> {
  const [row] = await exec
    .select({ value: max(habits.sortOrder) })
    .from(habits)
    .where(eq(habits.userId, userId));
  return row?.value == null ? 0 : row.value + 1;
}

export async function insertHabits(
  exec: Executor,
  userId: string,
  values: readonly (HabitValues & {
    createdOn: LogicalDate;
    sortOrder: number;
  })[],
): Promise<HabitRecord[]> {
  if (values.length === 0) return [];
  const rows = await exec
    .insert(habits)
    .values(values.map((v) => ({ ...v, userId })))
    .returning();
  // returning の順は入力の順と一致するが、念のため並び順で揃える
  return rows.map(toHabitRecord).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateHabit(
  exec: Executor,
  userId: string,
  habitId: string,
  values: HabitValues,
): Promise<HabitRecord | null> {
  if (!isUuid(habitId)) return null;
  const rows = await exec
    .update(habits)
    .set(values)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return rows[0] ? toHabitRecord(rows[0]) : null;
}

/** 過去の習慣にした日を設定する（null で現在の習慣に戻す）。更新できたら true */
export async function setArchivedOn(
  exec: Executor,
  userId: string,
  habitId: string,
  archivedOn: LogicalDate | null,
): Promise<boolean> {
  if (!isUuid(habitId)) return false;
  const rows = await exec
    .update(habits)
    .set({ archivedOn })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning({ id: habits.id });
  return rows.length > 0;
}

/** 指定した ID のうち、自分の習慣の ID だけを返す */
export async function filterOwnedHabitIds(
  exec: Executor,
  userId: string,
  habitIds: readonly string[],
): Promise<string[]> {
  const ids = habitIds.filter(isUuid);
  if (ids.length === 0) return [];
  const rows = await exec
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), inArray(habits.id, ids)));
  return rows.map((r) => r.id);
}

/** orderedIds の順に sort_order を 0, 1, 2… と振り直す */
export async function setSortOrders(
  exec: Executor,
  userId: string,
  orderedIds: readonly string[],
): Promise<void> {
  if (orderedIds.length === 0) return;
  // 1回の UPDATE にまとめる：sort_order = case when id = … then 0 when … then 1 … end
  const cases = orderedIds.map(
    (id, index) => sql`when ${habits.id} = ${id} then ${index}::integer`,
  );
  await exec
    .update(habits)
    .set({ sortOrder: sql`case ${sql.join(cases, sql` `)} end` })
    .where(and(eq(habits.userId, userId), inArray(habits.id, orderedIds)));
}
