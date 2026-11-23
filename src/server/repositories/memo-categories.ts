/**
 * memo_categories テーブル（メモのカテゴリ）の読み書き。すべての関数は userId で絞り、他人の行には触れない。
 * カテゴリを消してもメモは残る（外部キー memos_category_fk は on delete set null (category_id)）。
 */
import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { memoCategories } from "@/db/schema";
import type { MemoCategory } from "@/domain/memo";
import { isUuid, type Executor } from "./types";

export type MemoCategoryValues = Pick<
  MemoCategory,
  "name" | "prompt" | "dailyTarget"
>;

const columns = {
  id: memoCategories.id,
  name: memoCategories.name,
  prompt: memoCategories.prompt,
  dailyTarget: memoCategories.dailyTarget,
  sortOrder: memoCategories.sortOrder,
};

/** 並び順（同じなら作った順）のカテゴリ */
export async function listCategories(
  exec: Executor,
  userId: string,
): Promise<MemoCategory[]> {
  return exec
    .select(columns)
    .from(memoCategories)
    .where(eq(memoCategories.userId, userId))
    .orderBy(asc(memoCategories.sortOrder), asc(memoCategories.createdAt));
}

export async function findCategory(
  exec: Executor,
  userId: string,
  categoryId: string,
): Promise<MemoCategory | null> {
  if (!isUuid(categoryId)) return null;
  const [row] = await exec
    .select(columns)
    .from(memoCategories)
    .where(
      and(eq(memoCategories.userId, userId), eq(memoCategories.id, categoryId)),
    );
  return row ?? null;
}

/** カテゴリを並び順の最後に足す。並び順は渡した順（values の先頭が先） */
export async function insertCategories(
  exec: Executor,
  userId: string,
  values: readonly MemoCategoryValues[],
): Promise<MemoCategory[]> {
  if (values.length === 0) return [];
  const [{ next }] = (await exec
    .select({
      next: sql<number>`coalesce(max(${memoCategories.sortOrder}) + 1, 0)`.mapWith(
        Number,
      ),
    })
    .from(memoCategories)
    .where(eq(memoCategories.userId, userId))) as [{ next: number }];
  return exec
    .insert(memoCategories)
    .values(values.map((v, i) => ({ ...v, userId, sortOrder: next + i })))
    .returning(columns);
}

/** 書き換えたカテゴリ。自分のものでなければ null */
export async function updateCategory(
  exec: Executor,
  userId: string,
  categoryId: string,
  values: MemoCategoryValues,
): Promise<MemoCategory | null> {
  if (!isUuid(categoryId)) return null;
  const [row] = await exec
    .update(memoCategories)
    .set(values)
    .where(
      and(eq(memoCategories.userId, userId), eq(memoCategories.id, categoryId)),
    )
    .returning(columns);
  return row ?? null;
}

/** カテゴリを消す（メモはカテゴリなしで残る）。消したら true */
export async function deleteCategory(
  exec: Executor,
  userId: string,
  categoryId: string,
): Promise<boolean> {
  if (!isUuid(categoryId)) return false;
  const rows = await exec
    .delete(memoCategories)
    .where(
      and(eq(memoCategories.userId, userId), eq(memoCategories.id, categoryId)),
    )
    .returning({ id: memoCategories.id });
  return rows.length > 0;
}
