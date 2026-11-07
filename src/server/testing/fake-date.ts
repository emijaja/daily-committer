/**
 * domain/date.ts の toLogicalDate の代わり（domain の実装ができるまで、統合テストで差し替える）。
 * 使い方：
 *   vi.mock("@/domain/date", async (importOriginal) => ({
 *     ...(await importOriginal()),
 *     toLogicalDate: fakeToLogicalDate,
 *   }));
 */
import type { LogicalDate } from "@/domain/types";

export function fakeToLogicalDate(
  instant: Date,
  timezone: string,
  dayStartHour: number,
): LogicalDate {
  const shifted = new Date(instant.getTime() - dayStartHour * 60 * 60 * 1000);
  // en-CA は 'YYYY-MM-DD' の形で返す
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted) as LogicalDate;
}
