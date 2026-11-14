/** ログイン後に戻る先の既定値。入口（/）がオンボーディングの状態で O5 か ①-a かを決める */
export const DEFAULT_AFTER_LOGIN = "/";

/**
 * ログイン後に戻る先。外部サイトへの移動を防ぐため、同じサイト内のパスだけ許す。
 * `//evil.com` や `/\evil.com`（ブラウザは \ を / と同じに扱う）は外部へ飛ぶので弾く。
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) {
    return DEFAULT_AFTER_LOGIN;
  }
  // 制御文字（タブ・改行など。ブラウザは URL から取り除く）と \ を含むものは弾く
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return DEFAULT_AFTER_LOGIN;
  const base = "http://localhost";
  const url = new URL(next, base);
  if (url.origin !== base) return DEFAULT_AFTER_LOGIN;
  return url.pathname + url.search + url.hash;
}
