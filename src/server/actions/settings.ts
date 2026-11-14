"use server";
/**
 * 設定・オンボーディング・アカウントの Server Actions（⑦、O4・O5）。
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Habit, Settings } from "@/domain/types";
import { requireUser } from "@/server/auth";
import * as habits from "@/server/services/habits";
import * as settings from "@/server/services/settings";
import type { ActionResult } from "@/server/services/types";
import { presetNamesSchema, settingsPatchSchema } from "@/server/validation";
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

/**
 * O5 の決定。ブラウザのタイムゾーンを保存してから、選んだおすすめを登録する（0件なら登録しない）。
 * 作った日・記録の日付をこの端末の暦に合わせるため、タイムゾーンを先に保存する
 * （ログインの時点では既定値のまま。src/server/auth.ts）。保存できなくても登録は続ける。
 * 1回の呼び出しにまとめ、再検証も1回にする。
 */
export async function startWithPresetsAction(input: {
  timezone?: string;
  names: string[];
}): Promise<ActionResult<Habit[]>> {
  const user = await requireUser();
  return runAction(async () => {
    const { timezone, names } = z
      .object({ timezone: z.string().optional(), names: presetNamesSchema })
      .parse(input);
    if (timezone) {
      await settings
        .updateSettings(user.id, { timezone })
        .catch((error: unknown) =>
          console.error("タイムゾーンを保存できませんでした", error),
        );
    }
    const created = await habits.createHabitsFromPresets(user.id, names);
    revalidateAll();
    return created;
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
