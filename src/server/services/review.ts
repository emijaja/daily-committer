/**
 * 振り返り（⑥-a）・記録の確認（②）・習慣の詳細（③）のユースケース。
 *
 * 記録は期間の分をまとめて1回で取得し、草・連続・文章は domain で計算する（architecture.md 4章）。
 */
import "server-only";
import { db } from "@/db/client";
import { evaluatePeriod } from "@/domain/achievement";
import {
  addDays,
  isInRange,
  periodRange,
  splitDate,
  yearRange,
} from "@/domain/date";
import { allHabitsGrass, countRecords, habitGrass } from "@/domain/grass";
import { isActiveOn } from "@/domain/habit";
import {
  buildHabitStats,
  habitDetailGrassRange,
  selectHabitDetailGrumble,
  STREAK_UNIT,
} from "@/domain/habit-detail";
import { buildAchievements, buildAlmostThere } from "@/domain/review";
import { selectReviewGrumble } from "@/domain/review-grumble";
import { currentStreak, isPersonalBest, longestStreak } from "@/domain/streak";
import type {
  DateRange,
  Entry,
  Habit,
  LogicalDate,
  Period,
  Settings,
} from "@/domain/types";
import * as entriesRepo from "@/server/repositories/entries";
import * as habitsRepo from "@/server/repositories/habits";
import { toHabit } from "@/server/repositories/habits";
import { todayFor } from "./clock";
import { habitNotFound, ServiceError } from "./errors";
import { getSettings } from "./settings";
import type {
  DayEditView,
  HabitDetailView,
  RecordRow,
  ReviewView,
  UserId,
} from "./types";

/** 振り返り・詳細の計算に使う、まとめて取得した値 */
export interface ReviewSource {
  settings: Settings;
  today: LogicalDate;
  /** 過去の習慣も含むすべての習慣（並び順） */
  habits: Habit[];
  /** span の範囲の記録（日付の古い順） */
  entries: Entry[];
}

/**
 * 設定・今日・すべての習慣を取得し、span が返す範囲の記録をまとめて1回で取得する。
 * span は習慣と今日から、必要な記録の範囲を決める（③でも使う）。
 */
export async function loadReviewSource(
  userId: UserId,
  now: Date,
  span: (habits: readonly Habit[], today: LogicalDate) => DateRange,
): Promise<ReviewSource> {
  const settings = await getSettings(userId);
  const today = todayFor(settings, now);
  const habits = (await habitsRepo.listHabits(db, userId, "all")).map(toHabit);
  const entries = await entriesRepo.listEntries(db, userId, {
    range: span(habits, today),
  });
  return { settings, today, habits, entries };
}

/**
 * 今日の時点の連続を数えるのに要る範囲の始まり：現在の習慣のうち、いちばん古い作った日。
 * 連続は作った日より前を数えないので、これより前の記録は要らない。現在の習慣がなければ今日。
 */
export function streakSpanStart(
  habits: readonly Habit[],
  today: LogicalDate,
): LogicalDate {
  let start = today;
  for (const habit of habits) {
    if (isActiveOn(habit, today) && habit.createdOn < start) {
      start = habit.createdOn;
    }
  }
  return start;
}

/** その年に1日でも現在の習慣だったか */
function activeInRange(habit: Habit, range: DateRange): boolean {
  return (
    habit.createdOn <= range.end &&
    (habit.archivedOn === null || habit.archivedOn > range.start)
  );
}

const minDate = (a: LogicalDate, b: LogicalDate) => (a < b ? a : b);
const maxDate = (a: LogicalDate, b: LogicalDate) => (a > b ? a : b);

/**
 * ⑥-a。habitId を指定すると「習慣ごと」。
 * - 草・記録の件数はその年（1/1〜12/31）の分
 * - 「達成していること」「もう少しで達成」は今日の時点の連続なので、年によらず同じ。
 *   「習慣ごと」ではその習慣の分だけにする
 * 他人の習慣・存在しない habitId は not_found のエラー。
 */
export async function getReviewView(
  userId: UserId,
  year: number,
  habitId: string | null,
  now: Date = new Date(),
): Promise<ReviewView> {
  const range = yearRange(year);
  const [source, firstRecordDate] = await Promise.all([
    // その年の草と、今日の時点の連続の両方を含む範囲をまとめて取得する
    loadReviewSource(userId, now, (habits, today) => ({
      start: minDate(range.start, streakSpanStart(habits, today)),
      end: maxDate(range.end, today),
    })),
    entriesRepo.findFirstEntryDate(db, userId),
  ]);
  const { settings, today, habits, entries } = source;

  if (habitId !== null && !habits.some((h) => h.id === habitId)) {
    throw habitNotFound();
  }
  const target =
    habitId === null ? entries : entries.filter((e) => e.habitId === habitId);

  const reviewInput = {
    habits,
    entries,
    today,
    weekStart: settings.weekStart,
  };
  const onlyTarget = <T extends { habitId: string }>(items: T[]) =>
    habitId === null ? items : items.filter((i) => i.habitId === habitId);
  const achievements = onlyTarget(buildAchievements(reviewInput));
  const almostThere = onlyTarget(buildAlmostThere(reviewInput));
  const recordCount = countRecords(target, range);

  const selectable = habits.filter((h) => activeInRange(h, range));
  const current = selectable.filter((h) => h.archivedOn === null);
  const archived = selectable.filter((h) => h.archivedOn !== null);
  // 選んでいる習慣は、その年に現在の習慣でなくても選べるように残す
  const chosen =
    habitId !== null && !selectable.some((h) => h.id === habitId)
      ? habits.filter((h) => h.id === habitId)
      : [];

  return {
    year,
    habitId,
    today,
    weekStart: settings.weekStart,
    habits: [...current, ...archived, ...chosen],
    grass:
      habitId === null
        ? allHabitsGrass(habits, entries, range)
        : habitGrass(habitId, entries, range),
    recordCount,
    achievements,
    almostThere,
    grumble: settings.grumbleEnabled
      ? selectReviewGrumble({
          achievements,
          almostThere,
          recordCount,
          today,
          habitNames: Object.fromEntries(habits.map((h) => [h.id, h.name])),
        })
      : null,
    firstRecordDate,
  };
}

/**
 * ② 記録の確認・修正。
 * - 行はその日に「現在の習慣」だった習慣（作った日 <= date、過去にした日 > date）を、
 *   日次はその日・週次はその日を含む週・月次はその日を含む月の進み具合で返す
 * - beforeStart：いちばん古い作った日より前（習慣がなければ true）。行はすべて空になる
 * - 未来の日は invalid のエラー（記録できないため）
 */
export async function getDayEditView(
  userId: UserId,
  date: LogicalDate,
  now: Date = new Date(),
): Promise<DayEditView> {
  // 週の始まりは設定によるので、月の1日の6日前から読めば、どちらの週の始まりでも週の全体を含む
  const [source, firstRecordDate] = await Promise.all([
    loadReviewSource(userId, now, (habits, today) => {
      const range = dayEditCalendarRange(habits, date, today);
      return {
        start: addDays(range.start, -6),
        end: maxDate(today, periodRange("monthly", date, "mon").end),
      };
    }),
    entriesRepo.findFirstEntryDate(db, userId),
  ]);
  const { settings, today, habits, entries } = source;
  if (date > today) {
    throw new ServiceError("invalid", "未来の日付は開けません");
  }

  const startDate = earliestCreatedOn(habits);
  const active = habits.filter((h) => isActiveOn(h, date));
  const byHabit = Map.groupBy(entries, (e) => e.habitId);
  const rowsOf = (period: Period, range: DateRange): RecordRow[] =>
    active
      .filter((h) => h.period === period)
      .map((habit) => {
        const own = byHabit.get(habit.id) ?? [];
        return {
          habit,
          progress: evaluatePeriod(habit, own, range),
          entries: own.filter((e) => isInRange(e.date, range)),
        };
      });
  const weekRange = periodRange("weekly", date, settings.weekStart);
  const monthRange = periodRange("monthly", date, settings.weekStart);
  const calendarRange = dayEditCalendarRange(habits, date, today);

  return {
    date,
    daily: rowsOf("daily", { start: date, end: date }),
    weekly: { range: weekRange, rows: rowsOf("weekly", weekRange) },
    monthly: { range: monthRange, rows: rowsOf("monthly", monthRange) },
    beforeStart: startDate === null || date < startDate,
    today,
    weekStart: settings.weekStart,
    startDate,
    firstRecordDate,
    calendar: {
      range: calendarRange,
      grass: allHabitsGrass(habits, entries, calendarRange),
    },
  };
}

/** 過去の習慣も含め、いちばん古い作った日。習慣がなければ null */
function earliestCreatedOn(habits: readonly Habit[]): LogicalDate | null {
  let start: LogicalDate | null = null;
  for (const habit of habits) {
    if (start === null || habit.createdOn < start) start = habit.createdOn;
  }
  return start;
}

/** ② のカレンダーの範囲：習慣を始めた日と date のうち前のほうを含む月の1日から、今日まで */
function dayEditCalendarRange(
  habits: readonly Habit[],
  date: LogicalDate,
  today: LogicalDate,
): DateRange {
  const from = minDate(earliestCreatedOn(habits) ?? date, date);
  return { start: periodRange("monthly", from, "mon").start, end: today };
}

/**
 * ③ 習慣の詳細。過去の習慣も表示できる。他人の習慣・存在しない ID は null。
 * - いまの連続・最長連続・自己ベストは作った日からのすべての記録で数える（domain/streak.ts）
 * - 草は直近1年の2値（domain/habit-detail.ts の範囲）
 */
export async function getHabitDetail(
  userId: UserId,
  habitId: string,
  now: Date = new Date(),
): Promise<HabitDetailView | null> {
  const { settings, today, habits, entries } = await loadReviewSource(
    userId,
    now,
    (all, today) => {
      const habit = all.find((h) => h.id === habitId);
      if (!habit) return { start: today, end: today };
      const grassRange = habitDetailGrassRange(habit, today);
      return {
        start: minDate(
          minDate(habit.createdOn, grassRange.start),
          yearRange(splitDate(today)[0]).start,
        ),
        end: today,
      };
    },
  );
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return null;

  const own = entries.filter((e) => e.habitId === habit.id);
  const input = { habit, entries: own, today, weekStart: settings.weekStart };
  const current = currentStreak(input);
  const longest = longestStreak(input);
  const personalBest = isPersonalBest(input);
  const grassRange = habitDetailGrassRange(habit, today);
  const grass = habitGrass(habit.id, own, grassRange);

  return {
    habit,
    today,
    weekStart: settings.weekStart,
    streakUnit: STREAK_UNIT[habit.period],
    currentStreak: current,
    longestStreak: longest,
    isPersonalBest: personalBest,
    grass,
    stats: buildHabitStats(input, longest),
    grumble: settings.grumbleEnabled
      ? selectHabitDetailGrumble({
          habit,
          currentStreak: current,
          isPersonalBest: personalBest,
          hasRecords: grass.some((c) => c.level > 0),
          today,
        })
      : null,
  };
}
