import { safeNext } from "@/lib/safe-next";

/**
 * ログイン後に戻る先。?next があれば（同じサイト内のパスに限って）そこへ、
 * なければ・不正な値なら入口（/）へ。入口がオンボーディングの状態で O5 か ①-a かを決める。
 */
export function afterLogin(next: string | string[] | undefined): string {
  return safeNext(next);
}
