import { describe, expect, it } from "vitest";
import { evaluatePeriod } from "@/domain/achievement";
import { d, makeEntries, makeEntry, makeHabit } from "@/domain/fixtures";
import type { DateRange } from "@/domain/types";
import {
  dateNavLabel,
  dayEditCaption,
  dayEditWeekDays,
  monthHeading,
  weekHeading,
} from "./day-edit-format";

const week: DateRange = { start: d("2024-10-28"), end: d("2024-11-03") };
const month: DateRange = { start: d("2024-10-01"), end: d("2024-10-31") };
const day: DateRange = { start: d("2024-10-29"), end: d("2024-10-29") };

describe("日付と見出し", () => {
  it("日付ナビは 10.29・火・2024年", () => {
    expect(dateNavLabel(d("2024-10-29"))).toEqual({
      day: "10.29",
      dow: "火",
      year: "2024年",
    });
    expect(dateNavLabel(d("2025-01-05")).day).toBe("01.05");
  });

  it("週は 10/28〜11/3 の週、月は 2024年 10月", () => {
    expect(weekHeading(week)).toBe("10/28〜11/3 の週");
    expect(monthHeading(d("2024-10-29"))).toBe("2024年 10月");
  });
});

describe("dayEditCaption", () => {
  it("日次は 毎日、量で目標があれば 毎日 ・ 目標 30 回", () => {
    const reading = makeHabit();
    expect(dayEditCaption(reading, evaluatePeriod(reading, [], day))).toBe(
      "毎日",
    );
    const workout = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "total",
    });
    expect(dayEditCaption(workout, evaluatePeriod(workout, [], day))).toBe(
      "毎日 ・ 目標 30 回",
    );
  });

  it("週次のチェックは 週3回、月次は未達成なら あと N回 を添える", () => {
    const running = makeHabit({ period: "weekly", timesPerPeriod: 3 });
    expect(
      dayEditCaption(
        running,
        evaluatePeriod(
          running,
          makeEntries(running.id, ["2024-10-28", "2024-10-29"]),
          week,
        ),
      ),
    ).toBe("週3回");
    const gym = makeHabit({ period: "monthly", timesPerPeriod: 8 });
    const seven = makeEntries(
      gym.id,
      [1, 3, 5, 8, 10, 15, 29].map(
        (n) => `2024-10-${String(n).padStart(2, "0")}`,
      ),
    );
    expect(dayEditCaption(gym, evaluatePeriod(gym, seven, month))).toBe(
      "月8回 ・ あと1回",
    );
    const book = makeHabit({ period: "monthly", timesPerPeriod: 1 });
    expect(
      dayEditCaption(
        book,
        evaluatePeriod(book, [makeEntry(book.id, "2024-10-03")], month),
      ),
    ).toBe("月1回");
  });

  it("週次・月次の量は 週の目標 10 km（目標なしは 毎週）", () => {
    const run = makeHabit({
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "increment",
    });
    expect(dayEditCaption(run, evaluatePeriod(run, [], week))).toBe(
      "週の目標 10 km",
    );
    const free = { ...run, quantityTarget: null };
    expect(dayEditCaption(free, evaluatePeriod(free, [], week))).toBe("毎週");
  });
});

describe("dayEditWeekDays", () => {
  it("選んだ日を黄色に、今日より後と作った日より前は押せない", () => {
    const days = dayEditWeekDays(
      week,
      d("2024-10-29"),
      d("2024-11-01"),
      d("2024-10-29"),
      ["2024-10-29", "2024-10-30"],
    );
    expect(days.map((x) => x.label)).toEqual([
      "月",
      "火",
      "水",
      "木",
      "金",
      "土",
      "日",
    ]);
    expect(days.map((x) => x.done)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(days.map((x) => x.highlight)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    // 月（作る前）と、土・日（今日より後）は押せない
    expect(days.map((x) => x.future)).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});
