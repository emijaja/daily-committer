/**
 * entries テーブルの読み書き。すべての関数は userId で絞り、他人の行には触れない。
 *
 * 「1日1行」（チェックのみ・合計を入力の習慣）は DB の部分一意インデックス
 * entries_habit_date_single_unique（habit_id, date）where not multiple_per_day で守られている。
 * ここではその衝突先を使って upsert / 何もしない insert を行う。
 * 記録の持ち主と習慣の持ち主の一致は、複合外部キー entries_habit_fk が守る。
 */
import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { entries } from "@/db/schema";
import type { DateRange, Entry, LogicalDate } from "@/domain/types";
import type { HabitRecord } from "./habits";
import { isUuid, type Executor } from "./types";

type EntryRow = typeof entries.$inferSelect;

function toEntry(
  row: Pick<EntryRow, "id" | "habitId" | "date" | "quantity">,
): Entry {
  return {
    id: row.id,
    habitId: row.habitId,
    date: row.date as LogicalDate,
    quantity: row.quantity,
  };
}

/** 習慣の持ち主と multiple_per_day を、習慣の行からそのまま写した値 */
function ownership(userId: string, habit: HabitRecord) {
  return { habitId: habit.id, userId, multiplePerDay: habit.multiplePerDay };
}

const singlePerDayTarget = {
  target: [entries.habitId, entries.date],
  where: sql`not ${entries.multiplePerDay}`,
};

/** 記録を1行追加する（回ごとに足す習慣用）。追加した記録の ID を返す */
export async function insertEntry(
  exec: Executor,
  userId: string,
  habit: HabitRecord,
  date: LogicalDate,
  quantity: number | null,
): Promise<string> {
  const [row] = await exec
    .insert(entries)
    .values({ ...ownership(userId, habit), date, quantity })
    .returning({ id: entries.id });
  if (!row) throw new Error("記録を追加できませんでした");
  return row.id;
}

/**
 * 1日1行の習慣で、その日の行がなければ作る。すでにあれば何もしない。
 * 作ったら ID、すでにあったら null を返す。
 */
export async function insertSingleIfAbsent(
  exec: Executor,
  userId: string,
  habit: HabitRecord,
  date: LogicalDate,
  quantity: number | null,
): Promise<string | null> {
  const rows = await exec
    .insert(entries)
    .values({ ...ownership(userId, habit), date, quantity })
    .onConflictDoNothing(singlePerDayTarget)
    .returning({ id: entries.id });
  return rows[0]?.id ?? null;
}

/** 1日1行の習慣で、その日の量を上書きする（なければ作る）。記録の ID を返す */
export async function upsertSingle(
  exec: Executor,
  userId: string,
  habit: HabitRecord,
  date: LogicalDate,
  quantity: number,
): Promise<string> {
  const [row] = await exec
    .insert(entries)
    .values({ ...ownership(userId, habit), date, quantity })
    .onConflictDoUpdate({
      target: singlePerDayTarget.target,
      targetWhere: singlePerDayTarget.where,
      set: { quantity },
    })
    .returning({ id: entries.id });
  if (!row) throw new Error("記録を保存できませんでした");
  return row.id;
}

/** その習慣・その日の記録をすべて消す。消した件数を返す */
export async function deleteByHabitAndDate(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
): Promise<number> {
  if (!isUuid(habitId)) return 0;
  const rows = await exec
    .delete(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.habitId, habitId),
        eq(entries.date, date),
      ),
    )
    .returning({ id: entries.id });
  return rows.length;
}

/** 自分の記録を1件消す。消したら true（他人の記録・存在しない ID なら false） */
export async function deleteEntry(
  exec: Executor,
  userId: string,
  entryId: string,
): Promise<boolean> {
  if (!isUuid(entryId)) return false;
  const rows = await exec
    .delete(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return rows.length > 0;
}

/** その習慣・その日の記録があるか */
export async function existsOnDate(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
): Promise<boolean> {
  if (!isUuid(habitId)) return false;
  const rows = await exec
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.habitId, habitId),
        eq(entries.date, date),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** その習慣の、いちばん新しい（日付が新しく、同じ日なら後に作った）量の記録の量 */
export async function findLatestQuantity(
  exec: Executor,
  userId: string,
  habitId: string,
): Promise<number | null> {
  if (!isUuid(habitId)) return null;
  const [row] = await exec
    .select({ quantity: entries.quantity })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.habitId, habitId),
        isNotNull(entries.quantity),
      ),
    )
    .orderBy(desc(entries.date), desc(entries.createdAt), desc(entries.id))
    .limit(1);
  return row?.quantity ?? null;
}

/**
 * 自分の記録を取得する。habitIds を省くとすべての習慣、range を省くとすべての期間。
 * 日付の古い順（同じ日なら作った順）。
 */
export async function listEntries(
  exec: Executor,
  userId: string,
  filter: { habitIds?: readonly string[]; range?: DateRange } = {},
): Promise<Entry[]> {
  const conditions = [eq(entries.userId, userId)];
  if (filter.habitIds) {
    const ids = filter.habitIds.filter(isUuid);
    if (ids.length === 0) return [];
    conditions.push(inArray(entries.habitId, ids));
  }
  if (filter.range) {
    conditions.push(gte(entries.date, filter.range.start));
    conditions.push(lte(entries.date, filter.range.end));
  }
  const rows = await exec
    .select({
      id: entries.id,
      habitId: entries.habitId,
      date: entries.date,
      quantity: entries.quantity,
    })
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.date), asc(entries.createdAt), asc(entries.id));
  return rows.map(toEntry);
}

/**
 * 1日に複数行ある日を1行にまとめる（「回ごとに足す」から別の入力のしかたに変える前に使う）。
 * いちばん古い行を残して量を合計し、残りを消す。量がすべて空なら空のまま。
 * 呼び出し側で習慣の行をロックしてから使うこと。
 */
export async function mergeSameDayEntries(
  exec: Executor,
  userId: string,
  habitId: string,
): Promise<void> {
  await exec.execute(sql`
    with ranked as (
      select id, date,
             first_value(id) over (partition by date order by created_at, id) as keep_id,
             sum(quantity) over (partition by date) as total,
             count(*) over (partition by date) as n
      from ${entries}
      where ${entries.userId} = ${userId} and ${entries.habitId} = ${habitId}
    ),
    updated as (
      update ${entries} e set quantity = r.total
      from ranked r
      where e.id = r.id and r.id = r.keep_id and r.n > 1
      returning e.id
    )
    delete from ${entries} e
    using ranked r
    where e.id = r.id and r.id <> r.keep_id
  `);
}

/** 自分の記録のうち、いちばん古い日付。記録がなければ null。habitId を指定するとその習慣だけ */
export async function findFirstEntryDate(
  exec: Executor,
  userId: string,
  habitId?: string,
): Promise<LogicalDate | null> {
  const conditions = [eq(entries.userId, userId)];
  if (habitId !== undefined) {
    if (!isUuid(habitId)) return null;
    conditions.push(eq(entries.habitId, habitId));
  }
  const [row] = await exec
    .select({ date: entries.date })
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.date))
    .limit(1);
  return (row?.date as LogicalDate | undefined) ?? null;
}
