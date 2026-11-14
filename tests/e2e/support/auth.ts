/**
 * Better Auth のセッションの cookie を作る。
 * 値は「トークン.署名」を encodeURIComponent したもの。署名はトークンを BETTER_AUTH_SECRET で
 * HMAC-SHA256 した結果の base64（better-call の signCookieValue と同じ）。
 * アプリにテスト用のログインの入口は作らず、DB に作ったセッションをこの cookie でブラウザに渡す。
 */
import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { authSecret, BASE_URL } from "./env";

/** BETTER_AUTH_URL が http のときの cookie の名前（https なら __Secure- が付く） */
export const SESSION_COOKIE = "better-auth.session_token";

export function signedSessionCookie(token: string, secret = authSecret()) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

export async function signIn(
  context: BrowserContext,
  sessionToken: string,
): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: signedSessionCookie(sessionToken),
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
