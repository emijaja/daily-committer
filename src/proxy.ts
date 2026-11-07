import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { RETURN_TO_HEADER } from "@/lib/return-to";

/**
 * ログインが必要なページで、セッションの cookie がなければログイン画面へ移す。
 * cookie の有無を見るだけの楽観的なチェック。本当の確認は server 層の requireUser() で行う。
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const returnTo = pathname + search;

  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", returnTo);
    return NextResponse.redirect(url);
  }

  // cookie はあってもセッションが切れていた場合に、requireUser() が戻り先を
  // ログイン画面へ渡せるよう、今のパスをリクエストのヘッダーに入れる。
  // クライアントが送ってきた同名のヘッダーは上書きする。
  const headers = new Headers(request.headers);
  headers.set(RETURN_TO_HEADER, returnTo);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // (main) の画面。オンボーディングの O5・O4 はフェーズ3-1 で追加する
  matcher: [
    "/record/:path*",
    "/review/:path*",
    "/habits/:path*",
    "/settings/:path*",
  ],
};
