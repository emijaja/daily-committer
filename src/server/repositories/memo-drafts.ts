/**
 * memo_drafts テーブル（書きかけのメモ。ユーザーごとに1つ）の読み書き。
 * カテゴリの持ち主の一致は複合外部キー memo_drafts_category_fk が守る。
 */
import "server-only";
import { eq, sql } from "drizzle-orm";
import { memoDrafts } from "@/db/schema";
import type { LogicalDate } from "@/domain/types";
import type { Executor } from "./types";

export interface MemoDraft {
  date: LogicalDate;
  categoryId: string | null;
  body: string;
  updatedAt: Date;
}

export async function findDraft(
  exec: Executor,
  userId: string,
): Promise<MemoDraft | null> {
  const [row] = await exec
    .select({
      date: memoDrafts.date,
      categoryId: memoDrafts.categoryId,
      body: memoDrafts.body,
      updatedAt: memoDrafts.updatedAt,
    })
    .from(memoDrafts)
    .where(eq(memoDrafts.userId, userId));
  return row ? { ...row, date: row.date as LogicalDate } : null;
}

/** 下書きを保存する（前の下書きは上書きする） */
export async function upsertDraft(
  exec: Executor,
  userId: string,
  draft: Omit<MemoDraft, "updatedAt">,
): Promise<void> {
  await exec
    .insert(memoDrafts)
    .values({ userId, ...draft })
    .onConflictDoUpdate({
      target: memoDrafts.userId,
      set: { ...draft, updatedAt: sql`now()` },
    });
}

export async function deleteDraft(
  exec: Executor,
  userId: string,
): Promise<void> {
  await exec.delete(memoDrafts).where(eq(memoDrafts.userId, userId));
}
