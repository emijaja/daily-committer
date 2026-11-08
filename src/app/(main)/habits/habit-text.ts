/**
 * 習慣の一覧（④）・フォーム（⑤）で使う表示用の文字。
 */
import type { Habit, Period } from "@/domain/types";

export const PERIOD_TAG: Record<Period, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
};

const TIMES_PREFIX: Record<Exclude<Period, "daily">, string> = {
  weekly: "週",
  monthly: "月",
};

/**
 * 一覧の行の名前の下に出す習慣の設定（screens.md ④）。
 * - チェックのみ・毎日：「チェック」
 * - チェックのみ・毎週／毎月：「週3回 ・ チェック」
 * - 量も記録：「量（km） ・ 目標 10 km ・ 回ごとに足す」（目標なし・合計を入力のときはその部分を省く）
 *   量の習慣は回数を持たない（domain-spec.md 3章）ので、デザインの「週3回」は出さない。
 */
export function habitCaption(
  habit: Pick<
    Habit,
    | "period"
    | "recordType"
    | "timesPerPeriod"
    | "unit"
    | "quantityTarget"
    | "inputMode"
  >,
): string {
  const parts: string[] = [];
  if (habit.recordType === "check") {
    if (habit.period !== "daily" && habit.timesPerPeriod !== null) {
      parts.push(`${TIMES_PREFIX[habit.period]}${habit.timesPerPeriod}回`);
    }
    parts.push("チェック");
  } else {
    const unit = habit.unit ?? "";
    parts.push(`量（${unit}）`);
    if (habit.quantityTarget !== null) {
      parts.push(`目標 ${habit.quantityTarget} ${unit}`);
    }
    if (habit.inputMode === "increment") parts.push("回ごとに足す");
  }
  return parts.join(" ・ ");
}

/** 'YYYY-MM-DD' → 「2024年11月5日」 */
export function formatJapaneseDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
