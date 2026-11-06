import { notImplemented } from "./not-implemented";
import type { DateRange, LogicalDate, Period, WeekStart } from "./types";

/** 'YYYY-MM-DD' を検証して LogicalDate にする。不正なら例外。 */
export function parseLogicalDate(value: string): LogicalDate {
  return notImplemented(`parseLogicalDate(${value})`);
}

/**
 * ある時刻が、ユーザーにとってどの日付かを求める。
 * dayStartHour より前の時刻は前の日になる（例：4 なら 11/2 02:30 → 11/1）。
 */
export function toLogicalDate(
  instant: Date,
  timezone: string,
  dayStartHour: number,
): LogicalDate {
  return notImplemented(
    `toLogicalDate(${instant.toISOString()}, ${timezone}, ${dayStartHour})`,
  );
}

export function addDays(date: LogicalDate, days: number): LogicalDate {
  return notImplemented(`addDays(${date}, ${days})`);
}

/** 0 = 日曜 〜 6 = 土曜 */
export function dayOfWeek(date: LogicalDate): number {
  return notImplemented(`dayOfWeek(${date})`);
}

/** date を含む期間（日・週・月）。週は weekStart から始まる7日間。 */
export function periodRange(
  period: Period,
  date: LogicalDate,
  weekStart: WeekStart,
): DateRange {
  return notImplemented(`periodRange(${period}, ${date}, ${weekStart})`);
}

/** range の日付を古い順にすべて返す */
export function datesInRange(range: DateRange): LogicalDate[] {
  return notImplemented(`datesInRange(${range.start}, ${range.end})`);
}

export function compareDates(a: LogicalDate, b: LogicalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
