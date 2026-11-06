import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ログインが必要なページで、セッションの cookie がなければログイン画面へ移す。
 * cookie の有無を見るだけの楽観的なチェック。本当の確認は server 層の requireUser() で行う。
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
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
