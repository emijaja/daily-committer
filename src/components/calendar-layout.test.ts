import { describe, expect, it } from "vitest";
import {
  dayOfWeek,
  daysInMonth,
  toIsoDate,
  weekdayIndex,
  weekdayLabels,
} from "./calendar-layout";

describe("calendar-layout", () => {
  it("曜日を求める（2024-11-01 は金曜）", () => {
    expect(dayOfWeek("2024-11-01")).toBe(5);
    expect(weekdayIndex("2024-11-01", "mon")).toBe(4);
    expect(weekdayIndex("2024-11-01", "sun")).toBe(5);
    expect(weekdayIndex("2024-11-03", "mon")).toBe(6);
    expect(weekdayIndex("2024-11-03", "sun")).toBe(0);
  });

  it("週の始まりに合わせた曜日の名前", () => {
    expect(weekdayLabels("mon")[0]).toBe("月");
    expect(weekdayLabels("sun")[0]).toBe("日");
  });

  it("月の日数（うるう年を含む）", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 12)).toBe(31);
  });

  it("日付の文字列を作る", () => {
    expect(toIsoDate(2024, 3, 5)).toBe("2024-03-05");
  });
});
