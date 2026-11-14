/**
 * データの書き出し（⑦ DATA「データを書き出す」）。
 * 形式は domain/csv-export.ts を参照。そのユーザーの習慣（過去の習慣も含む）と記録だけを読む。
 */
import "server-only";
import { db } from "@/db/client";
import { buildEntriesCsv, exportFileName } from "@/domain/csv-export";
import * as entriesRepo from "@/server/repositories/entries";
import { listHabits, toHabit } from "@/server/repositories/habits";
import { getToday } from "./clock";
import type { UserId } from "./types";

export interface ExportFile {
  fileName: string;
  /** BOM つきの UTF-8 の CSV */
  content: string;
}

export async function exportEntriesCsv(
  userId: UserId,
  now: Date = new Date(),
): Promise<ExportFile> {
  const [habits, entries, today] = await Promise.all([
    listHabits(db, userId, "all"),
    entriesRepo.listEntries(db, userId),
    getToday(userId, now),
  ]);
  return {
    fileName: exportFileName(today),
    content: buildEntriesCsv(habits.map(toHabit), entries),
  };
}
