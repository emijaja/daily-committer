import { datesInRange, isInRange } from "./date";
import { isActiveOn } from "./habit";
import type { DateRange, Entry, Habit, LogicalDate } from "./types";

/** 草の4段階。0 = 記録なし 〜 3 = 濃い。domain-spec.md 6章 */
export type GrassLevel = 0 | 1 | 2 | 3;

export interface GrassCell {
  date: LogicalDate;
  level: GrassLevel;
}

/** 記録された日付ごとの、記録のあった習慣の集合（range 内だけ） */
function habitsByDate(
  entries: readonly Entry[],
  range: DateRange,
): Map<LogicalDate, Set<string>> {
  const map = new Map<LogicalDate, Set<string>>();
  for (const entry of entries) {
    if (!isInRange(entry.date, range)) continue;
    const set = map.get(entry.date);
    if (set) set.add(entry.habitId);
    else map.set(entry.date, new Set([entry.habitId]));
  }
  return map;
}

/** 割合 recorded / active から段階を決める（0 / 〜1/3 / 〜2/3 / それより上） */
function levelOf(recorded: number, active: number): GrassLevel {
  if (recorded === 0 || active === 0) return 0;
  // 浮動小数を避けて整数で比べる：r ≤ 1/3 ⇔ 3·recorded ≤ active
  if (3 * recorded <= active) return 1;
  if (3 * recorded <= 2 * active) return 2;
  return 3;
}

/**
 * すべての習慣の草。その日に記録のあった習慣の数 ÷ その日に現在の習慣だった数 で段階を決める。
 * 「現在の習慣だった」は createdOn <= 日付 かつ（archivedOn が null か 日付 < archivedOn）。
 * 週次・月次の習慣も、その日に記録があれば1と数える。分子もその日に現在の習慣だったものだけ数える。
 * range の日付を古い順にすべて返す。
 */
export function allHabitsGrass(
  habits: readonly Habit[],
  entries: readonly Entry[],
  range: DateRange,
): GrassCell[] {
  const recordedBy = habitsByDate(entries, range);
  return datesInRange(range).map((date) => {
    const active = habits.filter((habit) => isActiveOn(habit, date));
    const recordedSet = recordedBy.get(date);
    const recorded = recordedSet
      ? active.filter((habit) => recordedSet.has(habit.id)).length
      : 0;
    return { date, level: levelOf(recorded, active.length) };
  });
}

/** 習慣ごとの草（2値）。記録があれば level 3、なければ 0。range の日付を古い順にすべて返す */
export function habitGrass(
  habitId: string,
  entries: readonly Entry[],
  range: DateRange,
): GrassCell[] {
  const recorded = new Set(
    entries
      .filter((entry) => entry.habitId === habitId)
      .map((entry) => entry.date),
  );
  return datesInRange(range).map((date) => ({
    date,
    level: recorded.has(date) ? 3 : 0,
  }));
}

/**
 * 草のカードの「記録 ◯件」：記録のあった（習慣, 日）の組の数。
 * 「回ごとに足す」の習慣で同じ日に複数行あっても1件と数える。
 */
export function countRecords(
  entries: readonly Entry[],
  range: DateRange,
): number {
  let count = 0;
  for (const set of habitsByDate(entries, range).values()) count += set.size;
  return count;
}
