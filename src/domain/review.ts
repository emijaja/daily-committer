import { evaluatePeriod } from "./achievement";
import { daysBetween, periodRange } from "./date";
import { isActiveOn } from "./habit";
import { currentStreak, overTargetStreak, type StreakInput } from "./streak";
import type {
  Entry,
  Habit,
  LogicalDate,
  Period,
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

/** 達成していること：日次の連続を出す最小の日数 */
export const DAILY_STREAK_MIN = 3;
/** 達成していること：目標超えの連続を出す最小の日数 */
export const OVER_TARGET_STREAK_MIN = 2;
/** 達成していること：週次・月次の連続達成を出す最小の期間数 */
export const PERIOD_PACE_MIN = 2;
/** もう少しで達成：連続の節目（日） */
export const MILESTONES = [7, 14, 30, 50, 100, 200, 365] as const;
/** もう少しで達成：節目まであと何日以内で出すか */
export const MILESTONE_WITHIN = 3;
/** もう少しで達成：今期の目標まであと何回以内で出すか */
export const PERIOD_GOAL_WITHIN = 2;

/** 週次・月次の連続を日数に換算して比べるための日数 */
const DAYS_PER_PERIOD: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};
const PERIOD_UNIT: Record<Period, string> = {
  daily: "日",
  weekly: "週",
  monthly: "か月",
};
const PERIOD_PREFIX = { weekly: "週", monthly: "月" } as const;
const CURRENT_PERIOD = { weekly: "今週", monthly: "今月" } as const;

const plain = (text: string): TextSegment => ({ text });
const strong = (text: string): TextSegment => ({ text, emphasis: true });

/** 今日の時点で現在の習慣を並び順に並べ、習慣ごとの記録と組にする */
function activeHabitsWithEntries(input: ReviewInput) {
  const byHabit = new Map<string, Entry[]>();
  for (const entry of input.entries) {
    const list = byHabit.get(entry.habitId);
    if (list) list.push(entry);
    else byHabit.set(entry.habitId, [entry]);
  }
  return input.habits
    .filter((habit) => isActiveOn(habit, input.today))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((habit): StreakInput => ({
      habit,
      entries: byHabit.get(habit.id) ?? [],
      today: input.today,
      weekStart: input.weekStart,
    }));
}

/** スコアの大きい順（同じなら元の順＝習慣の並び順）。sort は安定ソート */
function byScore(items: ReviewItem[]): ReviewItem[] {
  return items.slice().sort((a, b) => b.score - a.score);
}

/** 週次・月次の「週3回ペース」「週10kmペース」の部分 */
function paceLabel(habit: Habit, period: "weekly" | "monthly"): string {
  const prefix = PERIOD_PREFIX[period];
  if (habit.recordType === "check") {
    return `${prefix}${habit.timesPerPeriod ?? 1}回ペース`;
  }
  if (habit.quantityTarget !== null) {
    return `${prefix}${habit.quantityTarget}${habit.unit ?? ""}ペース`;
  }
  return `${prefix}1回以上ペース`;
}

function achievementFor(streakInput: StreakInput): ReviewItem | null {
  const { habit } = streakInput;
  const streak = currentStreak(streakInput);

  if (habit.period !== "daily") {
    if (streak < PERIOD_PACE_MIN) return null;
    return {
      habitId: habit.id,
      kind: "periodPace",
      score: streak * DAYS_PER_PERIOD[habit.period],
      segments: [
        plain(`${habit.name}を `),
        strong(paceLabel(habit, habit.period)),
        plain(" で継続中"),
      ],
      figure: {
        value: streak,
        unit: PERIOD_UNIT[habit.period],
        caption: "連続",
      },
    };
  }

  const over = overTargetStreak(streakInput);
  const daily: ReviewItem | null =
    streak >= DAILY_STREAK_MIN
      ? {
          habitId: habit.id,
          kind: "dailyStreak",
          score: streak,
          segments: [
            plain(`${habit.name}を `),
            strong(`${streak}日`),
            plain(" 連続で続けています"),
          ],
          figure: { value: streak, unit: "日", caption: "連続" },
        }
      : null;
  const overItem: ReviewItem | null =
    over >= OVER_TARGET_STREAK_MIN
      ? {
          habitId: habit.id,
          kind: "overTargetStreak",
          score: over,
          segments: [
            plain(`${habit.name}で `),
            strong("目標超え"),
            plain(` が ${over}日連続`),
          ],
          figure: { value: over, unit: "日", caption: "目標超え" },
        }
      : null;
  // 1つの習慣につき1件。長いほうを出し、同じなら目標超えを優先する
  if (daily && overItem)
    return overItem.score >= daily.score ? overItem : daily;
  return daily ?? overItem;
}

/**
 * 達成していること（⑥-a）。domain-spec.md 7章。
 * - 日次の連続：連続 3日以上
 * - 目標超えの連続：日次の量の習慣で目標超えが 2日以上連続
 * - 週次・月次のペース：2期間以上の連続達成
 *
 * 対象は今日の時点で現在の習慣だけ。1つの習慣につき1件まで（日次の連続と目標超えの連続が
 * 両方当てはまるときは長いほう、同じ長さなら目標超え）。
 * 並びは連続の長い順（週次は7日・月次は30日に換算。score に入る）。同じなら習慣の並び順。
 */
export function buildAchievements(input: ReviewInput): ReviewItem[] {
  const items = activeHabitsWithEntries(input)
    .map(achievementFor)
    .filter((item): item is ReviewItem => item !== null);
  return byScore(items);
}

function milestoneFor(streakInput: StreakInput): ReviewItem | null {
  const { habit } = streakInput;
  const streak = currentStreak(streakInput);
  const next = MILESTONES.find((milestone) => milestone > streak);
  if (next === undefined || streak === 0) return null;
  const left = next - streak;
  if (left > MILESTONE_WITHIN) return null;
  return {
    habitId: habit.id,
    kind: "milestone",
    score: streak,
    segments: [
      plain(`あと${left}日続けると、${habit.name}が `),
      strong(`${next}日連続`),
    ],
    figure: { value: left, unit: "日", caption: "あと" },
  };
}

function periodGoalFor(
  streakInput: StreakInput,
  period: "weekly" | "monthly",
): ReviewItem | null {
  const { habit, today, weekStart } = streakInput;
  // 量の習慣は回数を持たないので対象外（domain-spec.md 3章）
  if (habit.recordType !== "check") return null;
  const range = periodRange(period, today, weekStart);
  const entries = streakInput.entries.filter(
    (entry) => entry.date >= habit.createdOn,
  );
  const progress = evaluatePeriod(habit, entries, range);
  const left = progress.remaining;
  if (progress.achieved || left === null || left > PERIOD_GOAL_WITHIN) {
    return null;
  }
  // 期間が残っているか：今日から期間の終わりまでの、まだ記録していない日で間に合うか
  const recordedToday = progress.recordedDates.includes(today);
  const daysLeft = daysBetween(today, range.end) + 1 - (recordedToday ? 1 : 0);
  if (daysLeft < left) return null;
  return {
    habitId: habit.id,
    kind: "periodGoal",
    score: currentStreak(streakInput) * DAYS_PER_PERIOD[period],
    segments: [
      strong(`あと${left}回`),
      plain(`で、${CURRENT_PERIOD[period]}の${habit.name}目標を達成`),
    ],
    figure: { value: left, unit: "回", caption: "あと" },
  };
}

/**
 * もう少しで達成（⑥-a）。domain-spec.md 7章。
 * - 連続の節目：日次の習慣で、次の節目（7・14・30・50・100・200・365日）まであと 3日以内
 * - 今期の目標：週次・月次のチェックのみの習慣で、今週・今月の目標まであと 1〜2回、
 *   かつ残りの日数で間に合う（今日すでに記録した日は数えない）
 *
 * 対象は今日の時点で現在の習慣だけ。1つの習慣につき1件まで。
 * 並びはいまの連続の長い順（週次は7日・月次は30日に換算）。同じなら習慣の並び順。
 */
export function buildAlmostThere(input: ReviewInput): ReviewItem[] {
  const items = activeHabitsWithEntries(input)
    .map((streakInput) => {
      const { period } = streakInput.habit;
      return period === "daily"
        ? milestoneFor(streakInput)
        : periodGoalFor(streakInput, period);
    })
    .filter((item): item is ReviewItem => item !== null);
  return byScore(items);
}
