/**
 * 記録へのひとこと（docs/web/domain-spec.md 2章 entry_notes）と、量のシートの「前回」チップ。
 * I/O なしの純粋関数。
 */
import type { Entry, Habit, LogicalDate } from "./types";

/** ひとことの長さの上限（文字数。絵文字も1文字と数える） */
export const NOTE_MAX_LENGTH = 140;

/** ひとことの文字数。UTF-16 の長さではなくコードポイントで数える（絵文字を2文字にしない） */
export function noteLength(body: string): number {
  return [...body].length;
}

/** 保存する形にそろえる：前後の空白を除く。空なら null（ひとことを消す） */
export function normalizeNote(body: string): string | null {
  const trimmed = body.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * 量のシートの「前回」チップに出す量（screens.md ⑧-a/⑧-b）。量の習慣でなければ null。
 * - 合計を入力：記録する日より前の日の、いちばん新しい記録の量（その日の合計）
 * - 回ごとに足す：記録する日まで（その日も含む）の、いちばん新しい1回分の量
 * entries はこの習慣の記録を日付の古い順（同じ日なら作った順）に渡す。前回がなければ null
 */
export function previousQuantity(
  habit: Habit,
  entries: readonly Entry[],
  date: LogicalDate,
): number | null {
  if (habit.recordType !== "quantity") return null;
  const includeSameDay = habit.inputMode === "increment";
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry || entry.habitId !== habit.id || entry.quantity === null)
      continue;
    if (entry.quantity <= 0) continue;
    if (entry.date < date || (includeSameDay && entry.date === date)) {
      return entry.quantity;
    }
  }
  return null;
}
