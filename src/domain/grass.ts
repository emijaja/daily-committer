import { notImplemented } from "./not-implemented";
import type { DateRange, Entry, Habit, LogicalDate } from "./types";

/** 草の4段階。0 = 記録なし 〜 3 = 濃い。domain-spec.md 6章 */
export type GrassLevel = 0 | 1 | 2 | 3;

export interface GrassCell {
  date: LogicalDate;
  level: GrassLevel;
}

/**
 * すべての習慣の草。その日に記録のあった習慣の数 ÷ その日に現在の習慣だった数 で段階を決める。
 * 「現在の習慣だった」は createdOn <= 日付 かつ（archivedOn が null か 日付 < archivedOn）。
 */
export function allHabitsGrass(
  habits: readonly Habit[],
  entries: readonly Entry[],
  range: DateRange,
): GrassCell[] {
  return notImplemented(
    `allHabitsGrass(${habits.length}, ${entries.length}, ${range.start})`,
  );
}

/** 習慣ごとの草（2値）。記録があれば level 3、なければ 0 */
export function habitGrass(
  habitId: string,
  entries: readonly Entry[],
  range: DateRange,
): GrassCell[] {
  return notImplemented(
    `habitGrass(${habitId}, ${entries.length}, ${range.start})`,
  );
}

/** 草のカードの「記録 ◯件」：記録のあった（習慣, 日）の組の数 */
export function countRecords(
  entries: readonly Entry[],
  range: DateRange,
): number {
  return notImplemented(`countRecords(${entries.length}, ${range.start})`);
}
