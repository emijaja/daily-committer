/**
 * memos テーブル（ぼやき・メモ）の読み書き。すべての関数は userId で絞り、他人の行には触れない。
 * - 習慣へのひとこと（habit_id がある行。□／＋の長押しで書く）：習慣・日ごとに1つ
 *   （部分一意インデックス memos_habit_date_unique）。listNotesOnDate・upsertNote・deleteNote
 * - ふつうのメモ（⑨。カテゴリつき・カテゴリなし）：1日に何件でも。listMemos 以降
 * メモと習慣・カテゴリの持ち主の一致は、複合外部キー memos_habit_fk・memos_category_fk が守る。
 */
import "server-only";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { habits, memos } from "@/db/schema";
import type { Memo } from "@/domain/memo";
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

/** 一覧に出すメモ。習慣へのひとことなら習慣の名前も持つ */
export interface MemoRecord extends Memo {
  habitName: string | null;
}

const memoColumns = {
  id: memos.id,
  date: memos.date,
  body: memos.body,
  categoryId: memos.categoryId,
  habitId: memos.habitId,
  createdAt: memos.createdAt,
  updatedAt: memos.updatedAt,
  habitName: habits.name,
};

function toMemo(row: {
  id: string;
  date: string;
  body: string;
  categoryId: string | null;
  habitId: string | null;
  createdAt: Date;
  updatedAt: Date;
  habitName: string | null;
}): MemoRecord {
  return { ...row, date: row.date as LogicalDate };
}

export interface MemoFilter {
  /** この日から（含む） */
  from?: LogicalDate;
  /** この日まで（含む） */
  to?: LogicalDate;
  /** カテゴリで絞る。null ならカテゴリなし（習慣へのひとことも含む） */
  categoryId?: string | null;
  /** 習慣へのひとことを含めない */
  excludeHabitNotes?: boolean;
}

/** メモ（日付の新しい順、同じ日なら書いた順の新しい順） */
export async function listMemos(
  exec: Executor,
  userId: string,
  filter: MemoFilter = {},
): Promise<MemoRecord[]> {
  const conditions = [eq(memos.userId, userId)];
  if (filter.from) conditions.push(gte(memos.date, filter.from));
  if (filter.to) conditions.push(lte(memos.date, filter.to));
  if (filter.categoryId === null) conditions.push(isNull(memos.categoryId));
  else if (filter.categoryId !== undefined) {
    if (!isUuid(filter.categoryId)) return [];
    conditions.push(eq(memos.categoryId, filter.categoryId));
  }
  if (filter.excludeHabitNotes) conditions.push(isNull(memos.habitId));
  const rows = await exec
    .select(memoColumns)
    .from(memos)
    .leftJoin(habits, eq(habits.id, memos.habitId))
    .where(and(...conditions))
    .orderBy(desc(memos.date), desc(memos.createdAt));
  return rows.map(toMemo);
}

export async function findMemo(
  exec: Executor,
  userId: string,
  memoId: string,
): Promise<MemoRecord | null> {
  if (!isUuid(memoId)) return null;
  const [row] = await exec
    .select(memoColumns)
    .from(memos)
    .leftJoin(habits, eq(habits.id, memos.habitId))
    .where(and(eq(memos.userId, userId), eq(memos.id, memoId)));
  return row ? toMemo(row) : null;
}

export interface MemoValues {
  date: LogicalDate;
  body: string;
  categoryId: string | null;
}

/** ふつうのメモ（習慣へのひとことではない）を足す。作った行の ID */
export async function insertMemo(
  exec: Executor,
  userId: string,
  values: MemoValues,
): Promise<string> {
  const [row] = await exec
    .insert(memos)
    .values({ ...values, userId })
    .returning({ id: memos.id });
  return row!.id;
}

/**
 * メモを書き換える。習慣へのひとことはカテゴリを持てないので、categoryId は無視して本文と日付だけ変える。
 * 自分のものでなければ false
 */
export async function updateMemo(
  exec: Executor,
  userId: string,
  memoId: string,
  values: MemoValues,
): Promise<boolean> {
  if (!isUuid(memoId)) return false;
  const rows = await exec
    .update(memos)
    .set({
      body: values.body,
      date: values.date,
      categoryId: sql`case when ${memos.habitId} is null then ${values.categoryId}::uuid else null end`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(memos.userId, userId), eq(memos.id, memoId)))
    .returning({ id: memos.id });
  return rows.length > 0;
}

/** メモを消す。消したら true */
export async function deleteMemo(
  exec: Executor,
  userId: string,
  memoId: string,
): Promise<boolean> {
  if (!isUuid(memoId)) return false;
  const rows = await exec
    .delete(memos)
    .where(and(eq(memos.userId, userId), eq(memos.id, memoId)))
    .returning({ id: memos.id });
  return rows.length > 0;
}
