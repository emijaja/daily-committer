/**
 * entry_notes テーブル（記録へのひとこと）の読み書き。すべての関数は userId で絞り、他人の行には触れない。
 * 習慣・日ごとに1つ（一意制約 entry_notes_habit_date_unique）。
 * ひとことと習慣の持ち主の一致は、複合外部キー entry_notes_habit_fk が守る。
 */
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { entryNotes } from "@/db/schema";
import type { LogicalDate } from "@/domain/types";
import { isUuid, type Executor } from "./types";

/** その日の、指定した習慣のひとこと。習慣の ID → 本文 */
export async function listNotesOnDate(
  exec: Executor,
  userId: string,
  habitIds: readonly string[],
  date: LogicalDate,
): Promise<Map<string, string>> {
  const ids = habitIds.filter(isUuid);
  if (ids.length === 0) return new Map();
  const rows = await exec
    .select({ habitId: entryNotes.habitId, body: entryNotes.body })
    .from(entryNotes)
    .where(
      and(
        eq(entryNotes.userId, userId),
        inArray(entryNotes.habitId, ids),
        eq(entryNotes.date, date),
      ),
    );
  return new Map(rows.map((r) => [r.habitId, r.body]));
}

/** ひとことを保存する（なければ作り、あれば書き換える） */
export async function upsertNote(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
  body: string,
): Promise<void> {
  await exec
    .insert(entryNotes)
    .values({ habitId, userId, date, body })
    .onConflictDoUpdate({
      target: [entryNotes.habitId, entryNotes.date],
      set: { body, updatedAt: sql`now()` },
    });
}

/** ひとことを消す。消したら true */
export async function deleteNote(
  exec: Executor,
  userId: string,
  habitId: string,
  date: LogicalDate,
): Promise<boolean> {
  if (!isUuid(habitId)) return false;
  const rows = await exec
    .delete(entryNotes)
    .where(
      and(
        eq(entryNotes.userId, userId),
        eq(entryNotes.habitId, habitId),
        eq(entryNotes.date, date),
      ),
    )
    .returning({ id: entryNotes.id });
  return rows.length > 0;
}
