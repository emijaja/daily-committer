/** テスト用のデータを作る関数。必要な項目だけ上書きして使う。 */
import type { Entry, Habit, LogicalDate, Settings } from "../types";

export const d = (value: string) => value as LogicalDate;

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: nextId("habit"),
    name: "読書",
    note: null,
    period: "daily",
    recordType: "check",
    timesPerPeriod: null,
    unit: null,
    quantityTarget: null,
    inputMode: null,
    createdOn: d("2024-01-01"),
    archivedOn: null,
    sortOrder: 0,
    ...overrides,
  };
}

export function makeEntry(
  habitId: string,
  date: string,
  quantity: number | null = null,
): Entry {
  return { id: nextId("entry"), habitId, date: d(date), quantity };
}

/** 複数の日付にまとめて記録を作る（チェックのみ用） */
export function makeEntries(
  habitId: string,
  dates: readonly string[],
): Entry[] {
  return dates.map((date) => makeEntry(habitId, date));
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    timezone: "Asia/Tokyo",
    weekStart: "mon",
    dayStartHour: 4,
    grumbleEnabled: true,
    grumblePush: false,
    reminderTime: null,
    ...overrides,
  };
}
