"use server";
/**
 * 設定・オンボーディング・アカウントの Server Actions（⑦、O4・O5）。
 */
import { redirect } from "next/navigation";
import type { Settings } from "@/domain/types";
import { requireUser } from "@/server/auth";
import * as settings from "@/server/services/settings";
import type { ActionResult } from "@/server/services/types";
import { settingsPatchSchema } from "@/server/validation";
import { revalidateAll } from "./revalidate";
import { runAction } from "./run";

/** ⑦ 設定を変える。オンボーディングでブラウザのタイムゾーンを保存するときにも使う */
export async function updateSettingsAction(
  patch: Partial<Settings>,
): Promise<ActionResult<Settings>> {
  const user = await requireUser();
  return runAction(async () => {
    const updated = await settings.updateSettings(
      user.id,
      settingsPatchSchema.parse(patch),
    );
    revalidateAll();
    return updated;
  });
}

/** O4 の最後：オンボーディングを終える */
export async function completeOnboardingAction(): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    await settings.completeOnboarding(user.id);
    revalidateAll();
  });
}

/**
 * ⑦-b アカウントを削除する。すべてのデータを消してログイン画面へ移動する
 * （セッションの行も CASCADE で消えるので、ログアウトした状態になる）。
 */
export async function deleteAccountAction(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(() => settings.deleteAccount(user.id));
  if (!result.ok) return result;
  revalidateAll();
  redirect("/login");
}
