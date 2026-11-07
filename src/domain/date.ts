/**
 * 論理日付（ユーザーの「1日」で決まる日付）の計算。domain-spec.md 3章。
 * 日付は 'YYYY-MM-DD' の文字列（LogicalDate）のまま扱い、JavaScript の Date は使わない。
 * 内部では 1970-01-01 からの通算日数（整数）に変換して計算する。
 */
import type { DateRange, LogicalDate, Period, WeekStart } from "./types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** その月の日数（うるう年を考慮）。month は 1〜12 */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** 1970-01-01 からの通算日数。Howard Hinnant の days_from_civil */
function toDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** toDayNumber の逆。Howard Hinnant の civil_from_days */
function fromDayNumber(dayNumber: number): [number, number, number] {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return [year, month, day];
}

/** 年・月・日から LogicalDate を作る（値の検証はしない） */
function format(year: number, month: number, day: number): LogicalDate {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` as LogicalDate;
}

/** LogicalDate を [年, 月, 日] に分ける */
export function splitDate(date: LogicalDate): [number, number, number] {
  return [
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)),
    Number(date.slice(8, 10)),
  ];
}

function dayNumberOf(date: LogicalDate): number {
  return toDayNumber(...splitDate(date));
}

/** 'YYYY-MM-DD' を検証して LogicalDate にする。不正なら例外。 */
export function parseLogicalDate(value: string): LogicalDate {
  const match = DATE_PATTERN.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1) {
      if (day <= daysInMonth(year, month)) return value as LogicalDate;
    }
  }
  throw new Error(`invalid logical date: ${value}`);
}

/** 年・月・日から LogicalDate を作る。不正なら例外。 */
export function makeLogicalDate(
  year: number,
  month: number,
  day: number,
): LogicalDate {
  return parseLogicalDate(format(year, month, day));
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    // 不正なタイムゾーンはここで RangeError になる
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

/**
 * ある時刻の、タイムゾーンでの暦の日付と時（0〜23）。
 * 「22時以降」の判定など、論理日付ではなく実際の時が必要なときに使う。
 */
export function localDateTime(
  instant: Date,
  timezone: string,
): { date: LogicalDate; hour: number } {
  const parts = formatterFor(timezone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    date: format(get("year"), get("month"), get("day")),
    hour: get("hour") % 24,
  };
}

/**
 * ある時刻が、ユーザーにとってどの日付かを求める。
 * dayStartHour より前の時刻は前の日になる（例：4 なら 11/2 02:30 → 11/1）。
 * dayStartHour は 0〜23 の整数。タイムゾーンが不正なら例外。
 */
export function toLogicalDate(
  instant: Date,
  timezone: string,
  dayStartHour: number,
): LogicalDate {
  if (
    !Number.isInteger(dayStartHour) ||
    dayStartHour < 0 ||
    dayStartHour > 23
  ) {
    throw new Error(`invalid dayStartHour: ${dayStartHour}`);
  }
  const { date, hour } = localDateTime(instant, timezone);
  return hour < dayStartHour ? addDays(date, -1) : date;
}

/** days 日後の日付（負なら前）。月・年の繰り上がりとうるう年を考慮する */
export function addDays(date: LogicalDate, days: number): LogicalDate {
  return format(...fromDayNumber(dayNumberOf(date) + days));
}

/** a から b までの日数（b − a）。同じ日なら 0、b が前なら負 */
export function daysBetween(a: LogicalDate, b: LogicalDate): number {
  return dayNumberOf(b) - dayNumberOf(a);
}

/** 0 = 日曜 〜 6 = 土曜 */
export function dayOfWeek(date: LogicalDate): number {
  // 1970-01-01 は木曜（4）
  return (((dayNumberOf(date) + 4) % 7) + 7) % 7;
}

/** date を含む期間（日・週・月）。週は weekStart から始まる7日間。 */
export function periodRange(
  period: Period,
  date: LogicalDate,
  weekStart: WeekStart,
): DateRange {
  switch (period) {
    case "daily":
      return { start: date, end: date };
    case "weekly": {
      const startDow = weekStart === "mon" ? 1 : 0;
      const offset = (dayOfWeek(date) - startDow + 7) % 7;
      const start = addDays(date, -offset);
      return { start, end: addDays(start, 6) };
    }
    case "monthly": {
      const [year, month] = splitDate(date);
      return {
        start: format(year, month, 1),
        end: format(year, month, daysInMonth(year, month)),
      };
    }
  }
}

/** range の次の期間（range は periodRange で作ったものであること） */
export function nextPeriodRange(
  period: Period,
  range: DateRange,
  weekStart: WeekStart,
): DateRange {
  return periodRange(period, addDays(range.end, 1), weekStart);
}

/** range の前の期間（range は periodRange で作ったものであること） */
export function previousPeriodRange(
  period: Period,
  range: DateRange,
  weekStart: WeekStart,
): DateRange {
  return periodRange(period, addDays(range.start, -1), weekStart);
}

/** その年の 1/1〜12/31（草の1年分の表示など） */
export function yearRange(year: number): DateRange {
  return { start: format(year, 1, 1), end: format(year, 12, 31) };
}

/** range の日付を古い順にすべて返す（start > end なら空） */
export function datesInRange(range: DateRange): LogicalDate[] {
  const first = dayNumberOf(range.start);
  const last = dayNumberOf(range.end);
  const dates: LogicalDate[] = [];
  for (let n = first; n <= last; n++) dates.push(format(...fromDayNumber(n)));
  return dates;
}

/** date が range に含まれるか（両端を含む） */
export function isInRange(date: LogicalDate, range: DateRange): boolean {
  return range.start <= date && date <= range.end;
}

/** 日付の比較。a が前なら負、同じなら 0、後なら正 */
export function compareDates(a: LogicalDate, b: LogicalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
