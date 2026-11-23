"use server";
/**
 * ぼやき・メモ（⑨）の Server Actions。
 * - ログインの確認は requireUser()（ログインしていなければログイン画面へ移動）
 * - 入力は zod で検証し、メモ・カテゴリ・下書きは必ずログイン中のユーザーのものに絞る（service）
 * - date を省くとサーバーで決めた今日に書く。未来の日付は拒否する
 */
import { z } from "zod";
import { requireUser } from "@/server/auth";
import * as memo from "@/server/services/memo";
import type { ActionResult } from "@/server/services/types";
import {
  idSchema,
  logicalDateSchema,
  memoCategoryInputSchema,
} from "@/server/validation";
import { revalidateMemos } from "./revalidate";
import { runAction } from "./run";

const memoInputSchema = z.object({
  date: logicalDateSchema.optional(),
  categoryId: idSchema.nullable(),
  body: z.string(),
});

/** ⑨-b：メモを送る。下書きから続きを書いたなら fromDraft（送ったら下書きを消す） */
export async function createMemoAction(input: {
  date?: string;
  categoryId: string | null;
  body: string;
  fromDraft?: boolean;
}): Promise<ActionResult<{ memoId: string }>> {
  const user = await requireUser();
  return runAction(async () => {
    const parsed = memoInputSchema
      .extend({ fromDraft: z.boolean().optional() })
      .parse(input);
    const memoId = await memo.createMemo(user.id, parsed);
    revalidateMemos();
    return { memoId };
  });
}

/** メモを書き換える。本文を空にしたら消す（deleted: true） */
export async function updateMemoAction(input: {
  memoId: string;
  date: string;
  categoryId: string | null;
  body: string;
}): Promise<ActionResult<{ deleted: boolean }>> {
  const user = await requireUser();
  return runAction(async () => {
    const { memoId, date, ...rest } = memoInputSchema
      .extend({ memoId: idSchema, date: logicalDateSchema })
      .parse(input);
    const id = await memo.updateMemo(user.id, memoId, { date, ...rest });
    revalidateMemos();
    return { deleted: id === null };
  });
}

/** ⑨-e：メモを消す */
export async function deleteMemoAction(input: {
  memoId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { memoId } = z.object({ memoId: idSchema }).parse(input);
    await memo.deleteMemo(user.id, memoId);
    revalidateMemos();
  });
}

/** ⑨-d：下書きに保存する（前の下書きは上書き。本文が空なら下書きを消す） */
export async function saveDraftAction(input: {
  date?: string;
  categoryId: string | null;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    await memo.saveDraft(user.id, memoInputSchema.parse(input));
    revalidateMemos();
  });
}

/** 下書きを捨てる */
export async function discardDraftAction(): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    await memo.discardDraft(user.id);
    revalidateMemos();
  });
}

const categoryInputSchema = z.object({
  name: z.string(),
  prompt: z.string().nullable(),
  dailyTarget: z.number().nullable(),
});

/** ⑨-c：カテゴリを足す */
export async function createCategoryAction(input: {
  name: string;
  prompt: string | null;
  dailyTarget: number | null;
}): Promise<ActionResult<{ categoryId: string }>> {
  const user = await requireUser();
  return runAction(async () => {
    const values = memoCategoryInputSchema.parse(
      categoryInputSchema.parse(input),
    );
    const created = await memo.createCategory(user.id, values);
    revalidateMemos();
    return { categoryId: created.id };
  });
}

/** ⑨-c：カテゴリを書き換える */
export async function updateCategoryAction(input: {
  categoryId: string;
  name: string;
  prompt: string | null;
  dailyTarget: number | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { categoryId, ...values } = categoryInputSchema
      .extend({ categoryId: idSchema })
      .parse(input);
    await memo.updateCategory(
      user.id,
      categoryId,
      memoCategoryInputSchema.parse(values),
    );
    revalidateMemos();
  });
}

/** ⑨-c：カテゴリを消す（メモはカテゴリなしで残る） */
export async function deleteCategoryAction(input: {
  categoryId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { categoryId } = z.object({ categoryId: idSchema }).parse(input);
    await memo.deleteCategory(user.id, categoryId);
    revalidateMemos();
  });
}
