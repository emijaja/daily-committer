import { isInRange } from "./date";
import type { DateRange, Entry, Habit, LogicalDate } from "./types";

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

/** 量の合計の浮動小数の誤差（0.1 + 0.2 など）を丸める */
function roundQuantity(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * 1つの習慣の、1つの期間の達成と進み具合を求める。domain-spec.md 3章の5パターン。
 * - 日次・チェックのみ：その日に記録がある
 * - 日次・量：合計 ≥ quantityTarget（目標なしなら合計 > 0）
 * - 週次・月次・チェックのみ：記録のある日数 ≥ timesPerPeriod
 * - 週次・月次・量（目標あり）：合計 ≥ quantityTarget
 * - 週次・月次・量（目標なし）：1日でも記録がある
 *
 * entries はその習慣の、少なくとも range の期間の記録を含むこと
 * （ほかの習慣・期間外の記録は無視する）。
 */
export function evaluatePeriod(
  habit: Habit,
  entries: readonly Entry[],
  range: DateRange,
): PeriodProgress {
  const inRange = entries.filter(
    (entry) => entry.habitId === habit.id && isInRange(entry.date, range),
  );
  const recordedDates = [
    ...new Set<LogicalDate>(inRange.map((entry) => entry.date)),
  ].sort();
  const base = { habitId: habit.id, range, recordedDates };

  if (habit.recordType === "check") {
    const days = recordedDates.length;
    const target =
      habit.period === "daily" ? 1 : Math.max(1, habit.timesPerPeriod ?? 1);
    const achieved = days >= target;
    return {
      ...base,
      measure: "days",
      current: days,
      target,
      achieved,
      overBy: null,
      remaining: achieved ? null : target - days,
    };
  }

  const current = roundQuantity(
    inRange.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0),
  );
  const target = habit.quantityTarget;
  let achieved: boolean;
  if (target !== null) achieved = current >= target;
  else if (habit.period === "daily") achieved = current > 0;
  else achieved = recordedDates.length > 0;

  return {
    ...base,
    measure: "quantity",
    current,
    target,
    achieved,
    overBy:
      target !== null && current > target
        ? roundQuantity(current - target)
        : null,
    remaining:
      target !== null && !achieved ? roundQuantity(target - current) : null,
  };
}

/** 記録画面の集計「2 / 3 完了」 */
export interface CompletionSummary {
  done: number;
  total: number;
}

/** 進み具合の一覧から「達成した数 / 全体の数」を数える */
export function summarize(
  progresses: readonly PeriodProgress[],
): CompletionSummary {
  return {
    done: progresses.filter((progress) => progress.achieved).length,
    total: progresses.length,
  };
}
