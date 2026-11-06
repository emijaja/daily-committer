import { notImplemented } from "./not-implemented";
import type { DateRange, Entry, Habit } from "./types";

/**
 * 1つの習慣の、1つの期間の進み具合。domain-spec.md 3章「期間の達成」。
 * - チェックのみ・日次：current は 0 か 1、target は 1
 * - チェックのみ・週次/月次：current は記録のある日数、target は timesPerPeriod
 * - 量：current は量の合計、target は quantityTarget（目標なしなら null）
 */
export interface PeriodProgress {
  habitId: string;
  range: DateRange;
  measure: "days" | "quantity";
  current: number;
  target: number | null;
  achieved: boolean;
  /** 目標超えの量（量の習慣で目標を超えたときだけ。それ以外は null） */
  overBy: number | null;
  /** 目標までの残り（達成済み・目標なしなら null） */
  remaining: number | null;
  /** 期間内で記録のある日付（①-b の曜日の四角など） */
  recordedDates: string[];
}

/** entries はその習慣の、少なくとも range の期間の記録を含むこと */
export function evaluatePeriod(
  habit: Habit,
  entries: readonly Entry[],
  range: DateRange,
): PeriodProgress {
  return notImplemented(
    `evaluatePeriod(${habit.id}, ${entries.length}, ${range.start})`,
  );
}

/** 記録画面の集計「2 / 3 完了」 */
export interface CompletionSummary {
  done: number;
  total: number;
}

export function summarize(
  progresses: readonly PeriodProgress[],
): CompletionSummary {
  return notImplemented(`summarize(${progresses.length})`);
}
