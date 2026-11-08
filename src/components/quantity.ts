/** 量の入力の小さな関数（表示用）。 */

/** 小数の誤差を丸めて表示用の文字列にする（例 6.2 + 2.5 → "8.7"） */
export function formatQuantity(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}

export type NumPadKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "backspace";

export interface NumPadOptions {
  /** 小数点以下の桁数の上限（0 なら小数点を受け付けない）。既定 2 */
  decimals?: number;
  /** 整数部の桁数の上限。既定 6 */
  maxIntegerDigits?: number;
}

/** 数字キーを1つ押したあとの入力の文字列 */
export function applyNumPadKey(
  value: string,
  key: NumPadKey,
  { decimals = 2, maxIntegerDigits = 6 }: NumPadOptions = {},
): string {
  if (key === "backspace") return value.slice(0, -1);
  if (key === ".") {
    if (decimals === 0 || value.includes(".")) return value;
    return value === "" ? "0." : `${value}.`;
  }
  const [int = "", frac] = value.split(".");
  if (frac !== undefined) {
    return frac.length >= decimals ? value : value + key;
  }
  if (int === "0") return key; // 先頭の 0 を置き換える
  return int.length >= maxIntegerDigits ? value : value + key;
}

/** 入力の文字列を数値にする（空や "." は 0） */
export function parseQuantity(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
