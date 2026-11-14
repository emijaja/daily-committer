/**
 * ② 記録の確認・修正の表示用の文字列を作る小さな関数（純粋関数）。
 * 日付の文字列は ① と同じものを record-format.ts から使う。
 */
import type { PeriodProgress } from "@/domain/achievement";
import { datesInRange, splitDate } from "@/domain/date";
import type { DateRange, Habit, LogicalDate } from "@/domain/types";
import { formatQuantity } from "@/components/quantity";
import type { WeekDay } from "@/components/WeekDots";
import { dowLabel, jaDate } from "../../record/record-format";

/** 日付ナビの大きな日付（10.29）と曜日（火）、下の小さな年（2024年） */
export function dateNavLabel(date: LogicalDate): {
  day: string;
  dow: string;
  year: string;
} {
  const [y, m, d] = splitDate(date);
  return {
    day: `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`,
    dow: dowLabel(date),
    year: `${y}年`,
  };
}

/** WEEKLY の見出し（10/28〜11/3 の週） */
export function weekHeading(range: DateRange): string {
  const [, sm, sd] = splitDate(range.start);
  const [, em, ed] = splitDate(range.end);
  return `${sm}/${sd}〜${em}/${ed} の週`;
}

/** MONTHLY の見出し（2024年 10月） */
export function monthHeading(date: LogicalDate): string {
  const [y, m] = splitDate(date);
  return `${y}年 ${m}月`;
}

/**
 * 行の名前の下の補足（Figma ②）。過去の日を直す画面なので、連続や「月末まで」は出さず、習慣の決まりを出す。
 * - 日次：毎日／毎日 ・ 目標 30 回
 * - 週次・チェック：週3回（曜日の四角で進み具合がわかるので残りは出さない）
 * - 月次・チェック：月8回 ・ あと1回（達成したら 月8回）
 * - 週次・月次・量：週の目標 10 km（目標なしは 毎週／毎月）
 */
export function dayEditCaption(habit: Habit, progress: PeriodProgress): string {
  const unit = habit.unit ?? "";
  if (habit.period === "daily") {
    if (habit.recordType === "quantity" && habit.quantityTarget !== null) {
      return `毎日 ・ 目標 ${formatQuantity(habit.quantityTarget)} ${unit}`;
    }
    return "毎日";
  }
  const p = habit.period === "weekly" ? "週" : "月";
  if (habit.recordType === "check") {
    const target = progress.target ?? 1;
    const head = `${p}${target}回`;
    if (habit.period === "monthly" && !progress.achieved && target > 1) {
      return `${head} ・ あと${progress.remaining ?? 0}回`;
    }
    return head;
  }
  if (habit.quantityTarget === null) {
    return habit.period === "weekly" ? "毎週" : "毎月";
  }
  return `${p}の目標 ${formatQuantity(habit.quantityTarget)} ${unit}`;
}

/**
 * 週次の行の曜日の四角。記録日は黒、選んだ日は黄色。
 * 今日より後と、習慣を作った日より前は押せない（灰色）。
 */
export function dayEditWeekDays(
  range: DateRange,
  selected: LogicalDate,
  today: LogicalDate,
  createdOn: LogicalDate,
  recordedDates: readonly string[],
): WeekDay[] {
  return datesInRange(range).map((date) => ({
    label: dowLabel(date),
    done: recordedDates.includes(date),
    future: date > today || date < createdOn,
    highlight: date === selected,
    ariaLabel: jaDate(date),
  }));
}

/**
 * 週次・月次の行の下の補足（黄色のマーカー）。行がある周期の分だけ書く。どちらもなければ null。
 * 週次は曜日の四角、月次は右のボタン（＋・□。量の習慣はシートが開く）で、その日の分を直す。
 * Figma の「月次は回数をタップ」は、月次の行に回数をタップする部品がないので使わない
 */
export function editHint(
  hasWeekly: boolean,
  hasMonthly: boolean,
): string | null {
  if (hasWeekly && hasMonthly) {
    return "週次は曜日を、月次は右のボタンをタップして、その日の分を直します";
  }
  if (hasWeekly) return "週次は曜日をタップして、その日の分を直します";
  if (hasMonthly) return "月次は右のボタンをタップして、この日の分を直します";
  return null;
}
