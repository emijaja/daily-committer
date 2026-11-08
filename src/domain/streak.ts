import { evaluatePeriod, type PeriodProgress } from "./achievement";
import { nextPeriodRange, periodRange, previousPeriodRange } from "./date";
import type { DateRange, Entry, Habit, LogicalDate, WeekStart } from "./types";

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

type Predicate = (progress: PeriodProgress) => boolean;

const isAchieved: Predicate = (progress) => progress.achieved;
const isOverTarget: Predicate = (progress) => progress.overBy !== null;

/**
 * 期間ごとの判定を用意する。
 * 作った日より前と、過去の習慣にした日以降の記録は数えない（その期間は未達成になる）。
 * 記録は期間の開始日ごとにまとめておき、期間の数 × 記録の数の計算を避ける。
 */
function makeJudge(input: StreakInput, predicate: Predicate) {
  const { habit, weekStart } = input;
  const buckets = new Map<LogicalDate, Entry[]>();
  for (const entry of input.entries) {
    if (entry.habitId !== habit.id || entry.date < habit.createdOn) continue;
    if (habit.archivedOn !== null && entry.date >= habit.archivedOn) continue;
    const key = periodRange(habit.period, entry.date, weekStart).start;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(entry);
    else buckets.set(key, [entry]);
  }
  return (range: DateRange) =>
    predicate(evaluatePeriod(habit, buckets.get(range.start) ?? [], range));
}

/** いまの習慣か（今日の時点で過去の習慣にしていない） */
function isCurrentHabit(habit: Habit, today: LogicalDate): boolean {
  return habit.archivedOn === null || today < habit.archivedOn;
}

/** 今日を含む期間からさかのぼって、predicate を満たす期間が続いた数 */
function countBackward(input: StreakInput, predicate: Predicate): number {
  const { habit, today, weekStart } = input;
  if (today < habit.createdOn || !isCurrentHabit(habit, today)) return 0;
  const judge = makeJudge(input, predicate);

  let range = periodRange(habit.period, today, weekStart);
  // 進行中の期間は、満たしていれば数え、満たしていなくても途切れさせない
  let count = judge(range) ? 1 : 0;
  range = previousPeriodRange(habit.period, range, weekStart);
  while (range.end >= habit.createdOn && judge(range)) {
    count++;
    range = previousPeriodRange(habit.period, range, weekStart);
  }
  return count;
}

/**
 * いまの連続（周期の数：日次は日、週次は週、月次は月）。
 * 進行中の期間（今日・今週・今月）は達成していれば数え、未達成でも途切れさせない。
 * 作った日より前は数えない。過去の習慣にしている習慣は 0。
 */
export function currentStreak(input: StreakInput): number {
  return countBackward(input, isAchieved);
}

/**
 * 最長連続（③）。作った日を含む期間から今日を含む期間までの中で、最も長い連続。
 * 過去の習慣にした日以降は未達成とみなす。
 */
export function longestStreak(input: StreakInput): number {
  const { habit, today, weekStart } = input;
  if (today < habit.createdOn) return 0;
  const judge = makeJudge(input, isAchieved);

  // 過去の習慣にした日を含む期間より後はすべて未達成なので、そこで打ち切る
  const last =
    habit.archivedOn !== null && habit.archivedOn < today
      ? habit.archivedOn
      : today;
  let longest = 0;
  let run = 0;
  let range = periodRange(habit.period, habit.createdOn, weekStart);
  for (;;) {
    run = judge(range) ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (range.end >= last) break;
    range = nextPeriodRange(habit.period, range, weekStart);
  }
  return longest;
}

/**
 * 自己ベスト更新中か（③）。いまの連続 = 最長連続 かつ 2 以上。
 */
export function isPersonalBest(input: StreakInput): boolean {
  const current = currentStreak(input);
  return current >= 2 && current === longestStreak(input);
}

/**
 * 日次の量の習慣で「目標超え」が続いている日数（振り返り用）。
 * 今日はまだ目標を超えていなくても途切れさせない。
 * 日次の量の習慣で目標があるとき以外は 0。
 */
export function overTargetStreak(input: StreakInput): number {
  const { habit } = input;
  if (
    habit.period !== "daily" ||
    habit.recordType !== "quantity" ||
    habit.quantityTarget === null
  ) {
    return 0;
  }
  return countBackward(input, isOverTarget);
}
