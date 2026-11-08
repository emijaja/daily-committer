import { evaluatePeriod } from "./achievement";
import {
  addDays,
  datesInRange,
  daysInMonth,
  periodRange,
  splitDate,
  yearRange,
} from "./date";
import { fillTemplate, pickBySeed, type Grumble } from "./grumble";
import type {
  DateRange,
  Entry,
  Expression,
  Habit,
  LogicalDate,
  Period,
  WeekStart,
} from "./types";

/**
 * ③ 習慣の詳細の計算。domain-spec.md 5章（連続）・6章（草）。
 * 連続そのものは streak.ts、草は grass.ts を使い、ここでは③だけの値（範囲・数字の箱・一言）を決める。
 */
export interface HabitDetailInput {
  habit: Habit;
  /** その習慣の記録（ほかの習慣の記録が混ざっていても無視する） */
  entries: readonly Entry[];
  today: LogicalDate;
  weekStart: WeekStart;
}

/** 数字の箱1つ */
export interface HabitStat {
  label: string;
  value: string;
  unit?: string;
}

/** 連続の単位（日次は日、週次は週、月次はか月） */
export type StreakUnit = "日" | "週" | "か月";

export const STREAK_UNIT: Record<Period, StreakUnit> = {
  daily: "日",
  weekly: "週",
  monthly: "か月",
};

/**
 * 草の範囲：直近1年（365日）。最後の日は今日。
 * 過去の習慣は、過去にした日の前の日を最後にする（その後は記録できないので、空の草にしない）。
 */
export function habitDetailGrassRange(
  habit: Habit,
  today: LogicalDate,
): DateRange {
  const lastActive =
    habit.archivedOn !== null ? addDays(habit.archivedOn, -1) : today;
  const end = lastActive < today ? lastActive : today;
  return { start: addDays(end, -364), end };
}

/** 小数の誤差を丸めて表示する（例 6.2 + 2.5 → "8.7"） */
function formatNumber(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/**
 * 数字の箱4つ（screens.md ③：最長連続 27日／今月 29/31日／今年の合計 212日／始めた日 1.8）。
 * - 最長連続：周期の単位で
 * - 2つ目：日次は「今月」の達成した日数 / その月の日数。
 *   週次・月次は今の期間（今週・今月）の進み具合（チェックは回、量は単位。目標なしなら合計だけ）
 * - 今年の合計：チェックのみは記録のあった日数、量は量の合計
 * - 始めた日：作った日（M.D と年）
 */
export function buildHabitStats(
  input: HabitDetailInput,
  longest: number,
): HabitStat[] {
  const { habit, today, weekStart } = input;
  const entries = input.entries.filter((e) => e.habitId === habit.id);
  const [year, month] = splitDate(today);

  let current: HabitStat;
  if (habit.period === "daily") {
    const monthRange = periodRange("monthly", today, weekStart);
    const achievedDays = datesInRange({ start: monthRange.start, end: today })
      .map((date) => evaluatePeriod(habit, entries, { start: date, end: date }))
      .filter((p) => p.achieved).length;
    current = {
      label: "今月",
      value: String(achievedDays),
      unit: `/ ${daysInMonth(year, month)}日`,
    };
  } else {
    const progress = evaluatePeriod(
      habit,
      entries,
      periodRange(habit.period, today, weekStart),
    );
    const unit = progress.measure === "days" ? "回" : (habit.unit ?? "");
    current = {
      label: habit.period === "weekly" ? "今週" : "今月",
      value: formatNumber(progress.current),
      unit:
        progress.target === null
          ? unit
          : `/ ${formatNumber(progress.target)}${unit}`,
    };
  }

  const thisYear = yearRange(year);
  const inYear = entries.filter(
    (e) => thisYear.start <= e.date && e.date <= thisYear.end,
  );
  const yearTotal: HabitStat =
    habit.recordType === "quantity"
      ? {
          label: "今年の合計",
          value: formatNumber(
            inYear.reduce((sum, e) => sum + (e.quantity ?? 0), 0),
          ),
          unit: habit.unit ?? "",
        }
      : {
          label: "今年の合計",
          value: String(new Set(inYear.map((e) => e.date)).size),
          unit: "日",
        };

  const [startYear, startMonth, startDay] = splitDate(habit.createdOn);
  return [
    {
      label: "最長連続",
      value: String(longest),
      unit: STREAK_UNIT[habit.period],
    },
    current,
    yearTotal,
    {
      label: "始めた日",
      value: `${startMonth}.${startDay}`,
      unit: `${startYear}年`,
    },
  ];
}

/**
 * ③のキャラの一言の場面。上から順に判定する（domain-spec.md 8章は記録画面の表なので、③用に決める）：
 * 1. 過去の習慣 → sleepy
 * 2. 自己ベスト更新中 → happy
 * 3. いまの連続が続いている（1以上） → happy
 * 4. 直近1年に記録がある → normal
 * 5. 記録がない → sleepy
 */
export type HabitDetailGrumbleScene =
  "archived" | "best" | "streak" | "recorded" | "empty";

const SCENE_EXPRESSION: Record<HabitDetailGrumbleScene, Expression> = {
  archived: "sleepy",
  best: "happy",
  streak: "happy",
  recorded: "normal",
  empty: "sleepy",
};

/** セリフのデータ。{habit}：習慣の名前、{value}{unit}：いまの連続（27日・3週） */
export const HABIT_DETAIL_GRUMBLE_LINES: Readonly<
  Record<HabitDetailGrumbleScene, readonly string[]>
> = {
  archived: [
    "{habit}、おやすみ中だね。ぼくもずっとおやすみ中。",
    "記録はちゃんと残ってるよ。ぼくが見てた。",
  ],
  best: [
    "自己ベスト更新中…！ ぼくは寝てただけなのに。",
    "{value}{unit}は、いままででいちばん長いよ。すごい。",
  ],
  streak: [
    "{habit}の日は、ぼくも隣で寝てるだけ。",
    "{value}{unit}続いてるね。ぼくは見てるだけ。",
    "{habit}、ゆるく続いてるのがえらい。",
  ],
  recorded: [
    "草、ちょっとずつ生えてるね。ぼくは生えない…。",
    "また{habit}する日、ぼくは待ってるね。",
  ],
  empty: [
    "{habit}の草、まだ生えてないね。ぼくといっしょ。",
    "まだ何もないね…。ぼくも寝てた。",
  ],
};

export interface HabitDetailGrumbleInput {
  habit: Habit;
  currentStreak: number;
  isPersonalBest: boolean;
  /** 直近1年に記録があるか */
  hasRecords: boolean;
  /** 日替わりでセリフを選ぶための種 */
  today: LogicalDate;
}

export function habitDetailGrumbleScene(
  input: HabitDetailGrumbleInput,
): HabitDetailGrumbleScene {
  if (input.habit.archivedOn !== null && input.habit.archivedOn <= input.today)
    return "archived";
  if (input.isPersonalBest) return "best";
  if (input.currentStreak > 0) return "streak";
  if (input.hasRecords) return "recorded";
  return "empty";
}

/** ③のキャラの一言。同じ日・同じ習慣・同じ場面なら同じセリフ */
export function selectHabitDetailGrumble(
  input: HabitDetailGrumbleInput,
): Grumble {
  const scene = habitDetailGrumbleScene(input);
  const template = pickBySeed(
    HABIT_DETAIL_GRUMBLE_LINES[scene],
    `habit:${input.habit.id}:${scene}:${input.today}`,
  );
  return {
    expression: SCENE_EXPRESSION[scene],
    text: fillTemplate(template, {
      habit: input.habit.name,
      value: input.currentStreak,
      unit: STREAK_UNIT[input.habit.period],
    }),
  };
}
