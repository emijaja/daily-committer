/**
 * ⑨-c から戻る先。?back= で渡された値のうち、メモの画面（/memo で始まる同じサイトのパス）だけを使う。
 * それ以外（外のサイト・// で始まる値など）は ⑨ に戻す。
 */
export function categoryBackHref(value: string | string[] | undefined): string {
  const back = Array.isArray(value) ? value[0] : value;
  if (back && /^\/memo(\/|\?|$)/.test(back) && !back.startsWith("//")) {
    return back;
  }
  return "/memo";
}
