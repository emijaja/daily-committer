import { describe, expect, it } from "vitest";
import {
  addDays,
  compareDates,
  datesInRange,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  isInRange,
  localDateTime,
  makeLogicalDate,
  nextPeriodRange,
  parseLogicalDate,
  periodRange,
  previousPeriodRange,
  toLogicalDate,
  yearRange,
} from "./date";
import { d } from "./fixtures";

describe("parseLogicalDate", () => {
  it("正しい日付はそのまま返す", () => {
    expect(parseLogicalDate("2024-02-29")).toBe("2024-02-29");
    expect(parseLogicalDate("2023-12-31")).toBe("2023-12-31");
  });

  it.each([
    "2023-02-29", // うるう年でない
    "1900-02-29", // 100で割り切れる年はうるう年でない
    "2024-13-01",
    "2024-00-10",
    "2024-04-31",
    "2024-01-00",
    "2024-1-01",
    "20240101",
    "",
  ])("不正な値 %s は例外", (value) => {
    expect(() => parseLogicalDate(value)).toThrow();
  });

  it("2000年はうるう年", () => {
    expect(parseLogicalDate("2000-02-29")).toBe("2000-02-29");
  });

  it("makeLogicalDate はゼロ埋めして検証する", () => {
    expect(makeLogicalDate(2024, 3, 5)).toBe("2024-03-05");
    expect(() => makeLogicalDate(2024, 2, 30)).toThrow();
  });
});

describe("daysInMonth", () => {
  it("月ごとの日数", () => {
    expect(daysInMonth(2024, 1)).toBe(31);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 4)).toBe(30);
    expect(daysInMonth(2024, 12)).toBe(31);
  });
});

describe("toLogicalDate", () => {
  // 2024-11-01T17:30:00Z = 東京 11/2 02:30
  const tokyo0230 = new Date("2024-11-01T17:30:00Z");

  it("切り替え時刻より前は前の日", () => {
    expect(toLogicalDate(tokyo0230, "Asia/Tokyo", 4)).toBe("2024-11-01");
  });

  it("切り替え時刻ちょうどはその日", () => {
    const tokyo0400 = new Date("2024-11-01T19:00:00Z");
    expect(toLogicalDate(tokyo0400, "Asia/Tokyo", 4)).toBe("2024-11-02");
  });

  it("切り替え時刻の直前（3:59）は前の日", () => {
    const tokyo0359 = new Date("2024-11-01T18:59:59Z");
    expect(toLogicalDate(tokyo0359, "Asia/Tokyo", 4)).toBe("2024-11-01");
  });

  it("切り替え時刻 0 なら暦の日付のまま", () => {
    expect(toLogicalDate(tokyo0230, "Asia/Tokyo", 0)).toBe("2024-11-02");
  });

  it("タイムゾーンで日付が変わる", () => {
    const instant = new Date("2024-11-01T12:00:00Z");
    expect(toLogicalDate(instant, "Asia/Tokyo", 4)).toBe("2024-11-01"); // 21:00
    expect(toLogicalDate(instant, "Pacific/Kiritimati", 4)).toBe("2024-11-01"); // 11/2 02:00 → 前の日
    expect(toLogicalDate(instant, "Pacific/Kiritimati", 0)).toBe("2024-11-02");
    expect(toLogicalDate(instant, "America/Los_Angeles", 4)).toBe("2024-11-01"); // 05:00
  });

  it("年の境目で前の年に戻る", () => {
    // 東京 2025-01-01 01:00
    const instant = new Date("2024-12-31T16:00:00Z");
    expect(toLogicalDate(instant, "Asia/Tokyo", 4)).toBe("2024-12-31");
  });

  it("夏時間の切り替え日も現地の時刻で判定する", () => {
    // ニューヨーク 2024-03-10 03:30 EDT（2:00 → 3:00 に進む日）
    const instant = new Date("2024-03-10T07:30:00Z");
    expect(toLogicalDate(instant, "America/New_York", 4)).toBe("2024-03-09");
    expect(toLogicalDate(instant, "America/New_York", 3)).toBe("2024-03-10");
  });

  it("不正な dayStartHour とタイムゾーンは例外", () => {
    expect(() => toLogicalDate(tokyo0230, "Asia/Tokyo", -1)).toThrow();
    expect(() => toLogicalDate(tokyo0230, "Asia/Tokyo", 24)).toThrow();
    expect(() => toLogicalDate(tokyo0230, "Asia/Tokyo", 1.5)).toThrow();
    expect(() => toLogicalDate(tokyo0230, "Not/AZone", 4)).toThrow();
  });

  it("localDateTime は暦の日付と時を返す（0時は 0）", () => {
    const tokyo0000 = new Date("2024-11-01T15:00:00Z");
    expect(localDateTime(tokyo0000, "Asia/Tokyo")).toEqual({
      date: "2024-11-02",
      hour: 0,
    });
  });
});

describe("addDays / daysBetween", () => {
  it("月末・年末をまたぐ", () => {
    expect(addDays(d("2024-01-31"), 1)).toBe("2024-02-01");
    expect(addDays(d("2024-12-31"), 1)).toBe("2025-01-01");
    expect(addDays(d("2025-01-01"), -1)).toBe("2024-12-31");
  });

  it("うるう年の2月", () => {
    expect(addDays(d("2024-02-28"), 1)).toBe("2024-02-29");
    expect(addDays(d("2023-02-28"), 1)).toBe("2023-03-01");
    expect(addDays(d("2024-03-01"), -1)).toBe("2024-02-29");
  });

  it("大きな日数と 0", () => {
    expect(addDays(d("2024-01-01"), 366)).toBe("2025-01-01");
    expect(addDays(d("2024-05-05"), 0)).toBe("2024-05-05");
    expect(addDays(d("1970-01-01"), -1)).toBe("1969-12-31");
  });

  it("daysBetween は b − a", () => {
    expect(daysBetween(d("2024-01-01"), d("2025-01-01"))).toBe(366);
    expect(daysBetween(d("2024-03-01"), d("2024-02-28"))).toBe(-2);
    expect(daysBetween(d("2024-03-01"), d("2024-03-01"))).toBe(0);
  });
});

describe("dayOfWeek", () => {
  it("0 = 日曜 〜 6 = 土曜", () => {
    expect(dayOfWeek(d("2024-11-03"))).toBe(0); // 日
    expect(dayOfWeek(d("2024-11-04"))).toBe(1); // 月
    expect(dayOfWeek(d("2024-11-09"))).toBe(6); // 土
    expect(dayOfWeek(d("1970-01-01"))).toBe(4); // 木
    expect(dayOfWeek(d("1969-12-28"))).toBe(0); // 1970 より前も正しく
    expect(dayOfWeek(d("2000-02-29"))).toBe(2); // 火
  });
});

describe("periodRange", () => {
  it("日次はその日だけ", () => {
    expect(periodRange("daily", d("2024-11-06"), "mon")).toEqual({
      start: "2024-11-06",
      end: "2024-11-06",
    });
  });

  it("週の始まり mon：日曜はその週の最後", () => {
    expect(periodRange("weekly", d("2024-11-10"), "mon")).toEqual({
      start: "2024-11-04",
      end: "2024-11-10",
    });
    expect(periodRange("weekly", d("2024-11-04"), "mon")).toEqual({
      start: "2024-11-04",
      end: "2024-11-10",
    });
  });

  it("週の始まり sun：日曜から土曜", () => {
    expect(periodRange("weekly", d("2024-11-10"), "sun")).toEqual({
      start: "2024-11-10",
      end: "2024-11-16",
    });
    expect(periodRange("weekly", d("2024-11-09"), "sun")).toEqual({
      start: "2024-11-03",
      end: "2024-11-09",
    });
  });

  it("週が月・年をまたぐ", () => {
    expect(periodRange("weekly", d("2025-01-01"), "mon")).toEqual({
      start: "2024-12-30",
      end: "2025-01-05",
    });
  });

  it("月は暦の月（うるう年の2月を含む）", () => {
    expect(periodRange("monthly", d("2024-02-10"), "mon")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
    expect(periodRange("monthly", d("2023-02-28"), "sun")).toEqual({
      start: "2023-02-01",
      end: "2023-02-28",
    });
    expect(periodRange("monthly", d("2024-12-31"), "mon")).toEqual({
      start: "2024-12-01",
      end: "2024-12-31",
    });
  });

  it("次の期間・前の期間", () => {
    const week = periodRange("weekly", d("2024-11-06"), "mon");
    expect(nextPeriodRange("weekly", week, "mon").start).toBe("2024-11-11");
    expect(previousPeriodRange("weekly", week, "mon").start).toBe("2024-10-28");
    const month = periodRange("monthly", d("2024-03-15"), "mon");
    expect(previousPeriodRange("monthly", month, "mon")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
    expect(nextPeriodRange("monthly", month, "mon").start).toBe("2024-04-01");
  });
});

describe("datesInRange / yearRange / isInRange / compareDates", () => {
  it("古い順にすべて返す", () => {
    expect(
      datesInRange({ start: d("2024-02-27"), end: d("2024-03-01") }),
    ).toEqual(["2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01"]);
  });

  it("1日だけ・逆順は空", () => {
    expect(
      datesInRange({ start: d("2024-01-01"), end: d("2024-01-01") }),
    ).toEqual(["2024-01-01"]);
    expect(
      datesInRange({ start: d("2024-01-02"), end: d("2024-01-01") }),
    ).toEqual([]);
  });

  it("うるう年の1年は366日", () => {
    expect(datesInRange(yearRange(2024))).toHaveLength(366);
    expect(datesInRange(yearRange(2023))).toHaveLength(365);
  });

  it("isInRange は両端を含む", () => {
    const range = { start: d("2024-01-01"), end: d("2024-01-31") };
    expect(isInRange(d("2024-01-01"), range)).toBe(true);
    expect(isInRange(d("2024-01-31"), range)).toBe(true);
    expect(isInRange(d("2024-02-01"), range)).toBe(false);
  });

  it("compareDates", () => {
    expect(compareDates(d("2024-01-01"), d("2024-01-02"))).toBe(-1);
    expect(compareDates(d("2024-01-02"), d("2024-01-01"))).toBe(1);
    expect(compareDates(d("2024-01-01"), d("2024-01-01"))).toBe(0);
  });
});
