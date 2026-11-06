import { notImplemented } from "./not-implemented";
import type {
  Entry,
  Habit,
  LogicalDate,
  TextSegment,
  WeekStart,
} from "./types";

/** 振り返りの文章。domain-spec.md 7章 */
export interface ReviewItem {
  habitId: string;
  kind:
    | "dailyStreak"
    | "overTargetStreak"
    | "periodPace"
    | "milestone"
    | "periodGoal";
  /** 並び替えに使う値（大きいほど上） */
  score: number;
  /** 表示する文。emphasis の部分を太字にする */
  segments: TextSegment[];
  /** ⑥-a の数字の箱に出す値と単位（例：27 / 日） */
  figure: { value: number; unit: string; caption?: string };
}

export interface ReviewInput {
  habits: readonly Habit[];
  entries: readonly Entry[];
  today: LogicalDate;
  weekStart: WeekStart;
}

/** 達成していること（連続3日以上など）。長い順。1つの習慣につき1件まで */
export function buildAchievements(input: ReviewInput): ReviewItem[] {
  return notImplemented(`buildAchievements(${input.habits.length})`);
}

/** もう少しで達成（次の節目まであと3日以内、今期の目標まであと1〜2回） */
export function buildAlmostThere(input: ReviewInput): ReviewItem[] {
  return notImplemented(`buildAlmostThere(${input.habits.length})`);
}
