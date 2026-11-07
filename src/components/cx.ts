/** クラス名をつなぐ（falsy は捨てる） */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * 見た目より小さい部品のタップ領域を 44px 四方まで広げる（透明な疑似要素）。
 * 付ける要素は position: relative になる。
 */
export const HIT_AREA =
  "relative after:absolute after:top-1/2 after:left-1/2 after:size-11 after:min-h-full after:min-w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";
