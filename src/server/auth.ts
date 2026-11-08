import "server-only";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import { RETURN_TO_HEADER } from "@/lib/return-to";
import { safeNext } from "@/lib/safe-next";
import { requiredEnv } from "@/lib/server-env";
import {
  account,
  session,
  user,
  userSettings,
  verification,
} from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: {
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      prompt: "select_account",
    },
  },
  databaseHooks: {
    session: {
      create: {
        // ログインのたびに設定の行があるか確かめ、なければ作る。
        // ユーザーの作成時だけにすると、そこで失敗したとき二度と作られないため。
        // ここで失敗するとログインも失敗するので、もう一度ログインすれば作り直せる。
        // タイムゾーンはあとでブラウザの値に更新する（オンボーディング）
        after: async (created) => {
          await ensureUserSettings(created.userId);
        },
      },
    },
  },
  // Server Actions から cookie を書けるようにする（必ず最後に置く）
  plugins: [nextCookies()],
});

/** user_settings の行がなければ既定値で作る（あれば何もしない） */
export async function ensureUserSettings(userId: string): Promise<void> {
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();
}

/**
 * オンボーディングを終えているか（user_settings.onboarded_at が入っているか）。
 * 設定の行がない場合も「終えていない」とみなす。
 * TODO: レーンC の settings の repository / service ができたら、そちらを使う形に移す
 */
export async function isOnboarded(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ onboardedAt: userSettings.onboardedAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.onboardedAt != null;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * ログイン中のユーザー。いなければ null。
 * Cache Components のため、呼び出す部分は <Suspense> の内側に置くこと。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const { id, name, email, image } = result.user;
  return { id, name, email, image: image ?? null };
});

/**
 * ログイン必須の処理の入口。ログインしていなければログイン画面へ移動する。
 * proxy.ts が入れた今のパスを next に付け、ログイン後に元の画面へ戻れるようにする。
 */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (current) return current;
  const returnTo = (await headers()).get(RETURN_TO_HEADER);
  redirect(
    returnTo
      ? `/login?next=${encodeURIComponent(safeNext(returnTo))}`
      : "/login",
  );
}
