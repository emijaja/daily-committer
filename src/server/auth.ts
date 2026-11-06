import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
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
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  databaseHooks: {
    user: {
      create: {
        // 初回ログイン時に設定の行を作る。タイムゾーンはあとでブラウザの値に更新する
        after: async (created) => {
          await db
            .insert(userSettings)
            .values({ userId: created.id })
            .onConflictDoNothing();
        },
      },
    },
  },
  // Server Actions から cookie を書けるようにする（必ず最後に置く）
  plugins: [nextCookies()],
});

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

/** ログイン必須の処理の入口。ログインしていなければログイン画面へ移動する */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}
