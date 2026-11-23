"use server";
/**
 * 記録とひとことの Server Actions（①②⑧⑩から呼ぶ）。
 * - ログインの確認は requireUser()（ログインしていなければログイン画面へ移動）
 * - 入力は zod で検証し、習慣・記録は必ずログイン中のユーザーのものに絞る（service）
 * - date を省くとサーバーで決めた今日に記録する。未来の日付は拒否する
 */
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { resolveRecordDate } from "@/server/services/clock";
import * as record from "@/server/services/record";
import type { ActionResult } from "@/server/services/types";
import {
  idSchema,
  logicalDateSchema,
  quantitySchema,
  quantityTotalSchema,
} from "@/server/validation";
import { revalidateRecords } from "./revalidate";
import { runAction } from "./run";

const habitDateSchema = z.object({
  habitId: idSchema,
  date: logicalDateSchema.optional(),
});

/** チェックのみの習慣の□。付けたら checked: true */
export async function toggleCheckAction(input: {
  habitId: string;
  date?: string;
}): Promise<ActionResult<{ checked: boolean; date: string }>> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId, date } = habitDateSchema.parse(input);
    const day = await resolveRecordDate(user.id, date);
    const checked = await record.toggleCheck(user.id, habitId, day);
    revalidateRecords();
    return { checked, date: day };
  });
}

/** ⑧-a：その日の合計を上書きする（0 なら記録を消す） */
export async function setQuantityTotalAction(input: {
  habitId: string;
  date?: string;
  quantity: number;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId, date, quantity } = habitDateSchema
      .extend({ quantity: quantityTotalSchema })
      .parse(input);
    const day = await resolveRecordDate(user.id, date);
    await record.setQuantityTotal(user.id, habitId, day, quantity);
    revalidateRecords();
  });
}

/** ⑧-b：1回分を追加する。取り消し用に記録の ID を返す */
export async function addQuantityAction(input: {
  habitId: string;
  date?: string;
  quantity: number;
}): Promise<ActionResult<{ entryId: string }>> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId, date, quantity } = habitDateSchema
      .extend({ quantity: quantitySchema })
      .parse(input);
    const day = await resolveRecordDate(user.id, date);
    const entryId = await record.addQuantity(user.id, habitId, day, quantity);
    revalidateRecords();
    return { entryId };
  });
}

/** □／＋の長押しのシート：ひとことを保存する（空なら消す）。保存した本文（消したら null）を返す */
export async function saveNoteAction(input: {
  habitId: string;
  date?: string;
  body: string;
}): Promise<ActionResult<{ note: string | null; date: string }>> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId, date, body } = habitDateSchema
      .extend({ body: z.string() })
      .parse(input);
    const day = await resolveRecordDate(user.id, date);
    const note = await record.saveNote(user.id, habitId, day, body);
    revalidateRecords();
    return { note, date: day };
  });
}

/** 記録を1件消す（取り消しのトースト、⑧-b の明細の削除） */
export async function deleteEntryAction(input: {
  entryId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { entryId } = z.object({ entryId: idSchema }).parse(input);
    await record.deleteEntry(user.id, entryId);
    revalidateRecords();
  });
}
