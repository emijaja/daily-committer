/**
 * 記録画面（①-a/b/c、⑧）の表示用の文字列を作る小さな関数。
 * I/O を持たない純粋関数なので、サーバーとクライアントの両方で使う。
 */
import type { PeriodProgress } from "@/domain/achievement";
import { dayOfWeek, datesInRange, daysBetween, splitDate } from "@/domain/date";
import type {
  DateRange,
  Entry,
  Habit,
  LogicalDate,
  Period,
} from "@/domain/types";
import { formatQuantity } from "@/components/quantity";
import type { WeekDay } from "@/components/WeekDots";
import type { RecordRow } from "@/server/services/types";

const DOW = ["日", "月", "火", "水", "木", "金", "土"] as const;

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "今日",
  weekly: "今週",
  monthly: "今月",
};

export const PERIOD_HREF: Record<Period, string> = {
  daily: "/record/today",
  weekly: "/record/week",
  monthly: "/record/month",
};

/** 曜日の1文字（月・火…） */
export function dowLabel(date: LogicalDate): string {
  return DOW[dayOfWeek(date)] ?? "";
}

/** 11月1日（金） */
export function jaDate(date: LogicalDate): string {
  const [, m, d] = splitDate(date);
  return `${m}月${d}日（${dowLabel(date)}）`;
}

/** 11/1 */
export function shortDate(date: LogicalDate): string {
  const [, m, d] = splitDate(date);
  return `${m}/${d}`;
}

/** 10/28〜11/3 */
export function rangeLabel(range: DateRange): string {
  return `${shortDate(range.start)}〜${shortDate(range.end)}`;
}

/** 2024年11月 */
export function monthLabel(date: LogicalDate): string {
  const [y, m] = splitDate(date);
  return `${y}年${m}月`;
}

/** 集計カードの小見出し（今日の記録　11月1日（金）など） */
export function summaryLabel(
  period: Period,
  today: LogicalDate,
  range: DateRange,
): string {
  const when =
    period === "daily"
      ? jaDate(today)
      : period === "weekly"
        ? rangeLabel(range)
        : monthLabel(today);
  return `${PERIOD_LABEL[period]}の記録　${when}`;
}

/** 集計カードの一番下（あと1つで、今日はコンプリート！）。習慣が0件なら null */
export function summaryMessage(
  period: Period,
  done: number,
  total: number,
): string | null {
  if (total === 0) return null;
  const left = total - done;
  return left > 0
    ? `あと${left}つで、${PERIOD_LABEL[period]}はコンプリート！`
    : `${PERIOD_LABEL[period]}はコンプリート！`;
}

/**
 * 吹き出しの下の小さな情報。
 * - 今日：21:04 ・ 今日の残り 1（残りは未達成の習慣の数）
 * - 今週：金曜 ・ 今週の残り 2日
 * - 今月：11月 ・ 今月の残り 29日
 */
export function speechMeta(
  period: Period,
  today: LogicalDate,
  range: DateRange,
  clock: string,
  pending: number,
): string {
  if (period === "daily") return `${clock} ・ 今日の残り ${pending}`;
  const daysLeft = daysBetween(today, range.end);
  if (period === "weekly") {
    return `${dowLabel(today)}曜 ・ 今週の残り ${daysLeft}日`;
  }
  return `${splitDate(today)[1]}月 ・ 今月の残り ${daysLeft}日`;
}

/** 上部タブの件数（2/3。習慣がなければ 0） */
export function tabCount(done: number, total: number): string {
  return total === 0 ? "0" : `${done}/${total}`;
}

/** 週次の行の曜日の四角。記録日は黒、今日は黄色、未来は灰色 */
export function weekDays(
  range: DateRange,
  today: LogicalDate,
  recordedDates: readonly string[],
): WeekDay[] {
  return datesInRange(range).map((date) => ({
    label: dowLabel(date),
    done: recordedDates.includes(date),
    future: date > today,
    highlight: date === today,
    ariaLabel: jaDate(date),
  }));
}

const PERIOD_SHORT: Record<Exclude<Period, "daily">, string> = {
  weekly: "週",
  monthly: "月",
};

/**
 * 行の名前の下の補足。
 * - 日次・チェック：6日連続／昨日で途切れました／毎日
 * - 日次・量：あと 10 回で目標／目標達成／目標超え +15 回（目標なしは「毎日」）
 * - 週次・月次・チェック：週3回 ・ あと2回／週1回 ・ 達成／月1回 ・ 月末まで
 * - 週次・月次・量：週の目標 10 km ・ あと 3.8 km（目標なしは「毎週」「毎月」）
 */
export function rowCaption(
  habit: Habit,
  progress: PeriodProgress,
  streak: RecordRow["streak"],
): string {
  const unit = habit.unit ?? "";
  if (habit.period === "daily") {
    if (habit.recordType === "check") {
      if (streak && streak.current > 0) return `${streak.current}日連続`;
      if (streak?.endedLastPeriod) return "昨日で途切れました";
      return "毎日";
    }
    if (progress.target === null) return "毎日";
    if (progress.overBy !== null) {
      return `目標超え +${formatQuantity(progress.overBy)} ${unit}`;
    }
    if (progress.achieved) return "目標達成";
    return `あと ${formatQuantity(progress.remaining ?? 0)} ${unit}で目標`;
  }

  const p = PERIOD_SHORT[habit.period];
  if (habit.recordType === "check") {
    const target = progress.target ?? 1;
    const head = `${p}${target}回`;
    if (progress.achieved) return `${head} ・ 達成`;
    if (target === 1) return `${head} ・ ${p}末まで`;
    return `${head} ・ あと${progress.remaining ?? 0}回`;
  }
  if (progress.target === null) {
    return habit.period === "weekly" ? "毎週" : "毎月";
  }
  const head = `${p}の目標 ${formatQuantity(progress.target)} ${unit}`;
  if (progress.overBy !== null) {
    return `${head} ・ +${formatQuantity(progress.overBy)} ${unit}`;
  }
  if (progress.achieved) return `${head} ・ 達成`;
  return `${head} ・ あと ${formatQuantity(progress.remaining ?? 0)} ${unit}`;
}

/** その日の量の合計（⑧-a の初期値） */
export function quantityOn(entries: readonly Entry[], date: LogicalDate) {
  return entries
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + (e.quantity ?? 0), 0);
}
