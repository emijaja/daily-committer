/**
 * 草とカレンダーの「マスの並べ方」だけを決める小さな関数（表示用）。
 * 日付の意味（論理日付・週の範囲など）は domain/date.ts が持つ。ここでは 'YYYY-MM-DD' の文字列から
 * 曜日と月を読むだけにする。
 */
import type { WeekStart } from "@/domain/types";

/** 'YYYY-MM-DD' の曜日（0 = 日曜 〜 6 = 土曜） */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** 週の始まりから数えた位置（0〜6） */
export function weekdayIndex(date: string, weekStart: WeekStart): number {
  const dow = dayOfWeek(date);
  return weekStart === "mon" ? (dow + 6) % 7 : dow;
}

/** 週の始まりから順の曜日の名前 */
export function weekdayLabels(weekStart: WeekStart): string[] {
  return weekStart === "mon"
    ? ["月", "火", "水", "木", "金", "土", "日"]
    : ["日", "月", "火", "水", "木", "金", "土"];
}

/** 'YYYY-MM-DD' の月（1〜12） */
export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

/** 'YYYY-MM-DD' の日（1〜31） */
export function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}

/** その月の日数 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 年・月・日から 'YYYY-MM-DD' を作る */
export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
