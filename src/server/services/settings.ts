import { notImplemented } from "@/domain/not-implemented";
import type { Settings, UserId } from "./types";

export async function getSettings(userId: UserId): Promise<Settings> {
  return notImplemented(`getSettings(${userId})`);
}

export async function updateSettings(
  userId: UserId,
  patch: Partial<Settings>,
): Promise<Settings> {
  return notImplemented(
    `updateSettings(${userId}, ${Object.keys(patch).join(",")})`,
  );
}

/** オンボーディングの完了（O4 の最後）。onboarded_at を記録する */
export async function completeOnboarding(userId: UserId): Promise<void> {
  return notImplemented(`completeOnboarding(${userId})`);
}

/** アカウントの削除。そのユーザーのデータをすべて消す */
export async function deleteAccount(userId: UserId): Promise<void> {
  return notImplemented(`deleteAccount(${userId})`);
}
