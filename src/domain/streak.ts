import { notImplemented } from "./not-implemented";
import type { Entry, Habit, LogicalDate, WeekStart } from "./types";

/**
 * 連続記録。domain-spec.md 5章。
 * 単位は習慣の周期（日・週・月）。いま進行中の期間は、未達成でも連続を途切れさせない。
 */
export interface StreakInput {
  habit: Habit;
  /** その習慣のすべての記録 */
  entries: readonly Entry[];
  today: LogicalDate;
  weekStart: WeekStart;
}

export function currentStreak(input: StreakInput): number {
  return notImplemented(`currentStreak(${input.habit.id})`);
}

export function longestStreak(input: StreakInput): number {
  return notImplemented(`longestStreak(${input.habit.id})`);
}

/** 日次の量の習慣で「目標超え」が続いている日数（振り返り用） */
export function overTargetStreak(input: StreakInput): number {
  return notImplemented(`overTargetStreak(${input.habit.id})`);
}
