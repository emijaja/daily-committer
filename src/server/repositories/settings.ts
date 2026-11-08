/**
 * user_settings の読み書きと、アカウント（user の行）の削除。
 */
import "server-only";
import { eq } from "drizzle-orm";
import { user, userSettings } from "@/db/schema";
import type { Settings } from "@/domain/types";
import type { Executor } from "./types";

type SettingsRow = typeof userSettings.$inferSelect;

function toSettings(row: SettingsRow): Settings {
  return {
    timezone: row.timezone,
    weekStart: row.weekStart,
    dayStartHour: row.dayStartHour,
    grumbleEnabled: row.grumbleEnabled,
    grumblePush: row.grumblePush,
    // DB の time は 'HH:MM:SS' で返るので 'HH:MM' にする
    reminderTime: row.reminderTime ? row.reminderTime.slice(0, 5) : null,
  };
}

/**
 * 設定の行がなければ既定値で作る（あれば何もしない）。
 * server/auth.ts の ensureUserSettings と同じ処理（auth.ts は Better Auth の設定を読み込むため、
 * service からは使わずにこちらを使う）。
 */
export async function ensureSettings(
  exec: Executor,
  userId: string,
): Promise<void> {
  await exec.insert(userSettings).values({ userId }).onConflictDoNothing();
}

export async function findSettings(
  exec: Executor,
  userId: string,
): Promise<Settings | null> {
  const [row] = await exec
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row ? toSettings(row) : null;
}

export async function updateSettings(
  exec: Executor,
  userId: string,
  patch: Partial<Settings>,
): Promise<Settings | null> {
  if (Object.keys(patch).length === 0) return findSettings(exec, userId);
  const [row] = await exec
    .update(userSettings)
    .set(patch)
    .where(eq(userSettings.userId, userId))
    .returning();
  return row ? toSettings(row) : null;
}

export async function findOnboardedAt(
  exec: Executor,
  userId: string,
): Promise<Date | null> {
  const [row] = await exec
    .select({ onboardedAt: userSettings.onboardedAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row?.onboardedAt ?? null;
}

export async function setOnboardedAt(
  exec: Executor,
  userId: string,
  at: Date,
): Promise<void> {
  await exec
    .update(userSettings)
    .set({ onboardedAt: at })
    .where(eq(userSettings.userId, userId));
}

/** user の行を消す。外部キーの CASCADE で設定・習慣・記録・セッションもすべて消える */
export async function deleteUser(
  exec: Executor,
  userId: string,
): Promise<void> {
  await exec.delete(user).where(eq(user.id, userId));
}
