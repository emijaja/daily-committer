/**
 * memos テーブル（ぼやき・メモ）の読み書き。すべての関数は userId で絞り、他人の行には触れない。
 * いまは習慣へのひとこと（habit_id がある行。□／＋の長押しで書く）だけを扱う。
 * 習慣・日ごとに1つ（部分一意インデックス memos_habit_date_unique）。
 * メモと習慣の持ち主の一致は、複合外部キー memos_habit_fk が守る。
 */
import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { memos } from "@/db/schema";
import type { LogicalDate } from "@/domain/types";
import { isUuid, type Executor } from "./types";

/** その日の、指定した習慣へのひとこと。習慣の ID → 本文 */
export async function listNotesOnDate(
  exec: Executor,
  userId: string,
  habitIds: readonly string[],
  date: LogicalDate,
): Promise<Map<string, string>> {
  const ids = habitIds.filter(isUuid);
  if (ids.length === 0) return new Map();
  const rows = await exec
    .select({ habitId: memos.habitId, body: memos.body })
    .from(memos)
    .where(
      and(
        eq(memos.userId, userId),
        inArray(memos.habitId, ids),
        eq(memos.date, date),
      ),
    );
  return new Map(
    rows.flatMap((r) => (r.habitId ? [[r.habitId, r.body] as const] : [])),
  );
}

/** 習慣へのひとことを保存する（なければ作り、あれば書き換える） */
export async function upsertNote(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
  body: string,
): Promise<void> {
  await exec
    .insert(memos)
    .values({ habitId, userId, date, body })
    .onConflictDoUpdate({
      target: [memos.habitId, memos.date],
      targetWhere: isNotNull(memos.habitId),
      set: { body, updatedAt: sql`now()` },
    });
}

/** 習慣へのひとことを消す。消したら true */
export async function deleteNote(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
): Promise<boolean> {
  if (!isUuid(habitId)) return false;
  const rows = await exec
    .delete(memos)
    .where(
      and(
        eq(memos.userId, userId),
        eq(memos.habitId, habitId),
        eq(memos.date, date),
      ),
    )
    .returning({ id: memos.id });
  return rows.length > 0;
}
