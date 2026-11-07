/**
 * Server Actions の共通処理。失敗を例外ではなく ActionResult で返す（services/types.ts）。
 * - 入力の検証エラー（zod）と ServiceError は、そのメッセージを返す
 * - それ以外は内部のエラーとしてログに出し、詳細は返さない
 * - Next.js の redirect などの制御用の例外は、そのまま投げ直す
 */
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ServiceError } from "@/server/services/errors";
import type { ActionResult } from "@/server/services/types";

export const INVALID_INPUT = "入力の値が正しくありません";
export const UNEXPECTED_ERROR =
  "保存できませんでした。時間をおいてもう一度お試しください";

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError) {
      const custom = error.issues.find((issue) => issue.code === "custom");
      return { ok: false, error: custom?.message ?? INVALID_INPUT };
    }
    if (error instanceof ServiceError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: UNEXPECTED_ERROR };
  }
}
