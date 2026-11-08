import "server-only";
import { cache } from "react";
import { db } from "@/db/client";
import * as settingsRepo from "@/server/repositories/settings";
import { settingsPatchSchema } from "@/server/validation";
import { ServiceError } from "./errors";
import type { Settings, UserId } from "./types";

/**
 * 行がなければ既定値の行を作ってから返す。
 * 1回の描画の中では結果を使い回す（記録の画面で getRecordView と時計の表示の両方が読むため）。
 * 更新は updateSettings の戻り値を使い、更新したあとに同じ描画の中でこれを読み直さないこと。
 */
export const getSettings = cache(async function getSettings(
  userId: UserId,
): Promise<Settings> {
  const found = await settingsRepo.findSettings(db, userId);
  if (found) return found;
  await settingsRepo.ensureSettings(db, userId);
  const created = await settingsRepo.findSettings(db, userId);
  if (!created)
    throw new Error(`user_settings を作れませんでした（${userId}）`);
  return created;
});

export async function updateSettings(
  userId: UserId,
  patch: Partial<Settings>,
): Promise<Settings> {
  const parsed = settingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    throw new ServiceError("invalid", "設定の値が正しくありません");
  }
  await settingsRepo.ensureSettings(db, userId);
  const updated = await settingsRepo.updateSettings(db, userId, parsed.data);
  if (!updated)
    throw new Error(`user_settings を更新できませんでした（${userId}）`);
  return updated;
}

/**
 * オンボーディングを終えているか（user_settings.onboarded_at が入っているか）。
 * 設定の行がない場合も「終えていない」とみなす。
 */
export async function isOnboarded(userId: UserId): Promise<boolean> {
  return (await settingsRepo.findOnboardedAt(db, userId)) != null;
}

/** オンボーディングの完了（O4 の最後）。onboarded_at を記録する（2回目以降は最初の日時のまま） */
export async function completeOnboarding(
  userId: UserId,
  now: Date = new Date(),
): Promise<void> {
  await settingsRepo.ensureSettings(db, userId);
  if (await settingsRepo.findOnboardedAt(db, userId)) return;
  await settingsRepo.setOnboardedAt(db, userId, now);
}

/** アカウントの削除。そのユーザーのデータをすべて消す */
export async function deleteAccount(userId: UserId): Promise<void> {
  await settingsRepo.deleteUser(db, userId);
}
