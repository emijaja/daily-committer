/**
 * 記録の CSV 書き出し（⑦ DATA「データを書き出す」）。I/O なしの純粋関数。
 *
 * 形式（domain-spec.md 2章の列名にそろえる）：
 * - 1行目は見出し：date,habit_id,habit_name,period,record_type,quantity,unit
 * - 記録1件につき1行（回ごとに足す習慣は、同じ日に複数行になる）。並びは渡した記録の順
 * - 文字コードは UTF-8（Excel で文字化けしないよう、先頭に BOM を付ける）。改行は CRLF（RFC 4180）
 * - カンマ・ダブルクォート・改行を含む値はダブルクォートで囲み、中の " は "" にする
 * - 表計算ソフトで式として実行されないよう、= + - @ タブ CR で始まる文字列の前に ' を付ける
 * - 習慣の見つからない記録（通常は起きない）は書き出さない
 */
import type { Entry, Habit } from "./types";

export const CSV_HEADER = [
  "date",
  "habit_id",
  "habit_name",
  "period",
  "record_type",
  "quantity",
  "unit",
] as const;

const BOM = "﻿";
const EOL = "\r\n";

export function buildEntriesCsv(
  habits: readonly Habit[],
  entries: readonly Entry[],
): string {
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const lines = [CSV_HEADER.join(",")];
  for (const entry of entries) {
    const habit = habitById.get(entry.habitId);
    if (!habit) continue;
    lines.push(
      [
        entry.date,
        habit.id,
        textCell(habit.name),
        habit.period,
        habit.recordType,
        entry.quantity === null ? "" : String(entry.quantity),
        habit.unit === null ? "" : textCell(habit.unit),
      ].join(","),
    );
  }
  return BOM + lines.join(EOL) + EOL;
}

/** 利用者が入力した文字列の欄。式の実行を防いでから、必要ならクォートする */
function textCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** ダウンロードのファイル名。例 confidently-2024-11-06.csv */
export function exportFileName(today: string): string {
  return `confidently-${today}.csv`;
}
