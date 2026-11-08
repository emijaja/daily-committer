import { describe, expect, it } from "vitest";
import { formatJapaneseDate, habitCaption } from "./habit-text";

const base = {
  period: "daily",
  recordType: "check",
  timesPerPeriod: null,
  unit: null,
  quantityTarget: null,
  inputMode: null,
} as const;

describe("habitCaption", () => {
  it("毎日・チェックのみは「チェック」", () => {
    expect(habitCaption(base)).toBe("チェック");
  });

  it("毎週・毎月のチェックのみは回数を前に出す", () => {
    expect(habitCaption({ ...base, period: "weekly", timesPerPeriod: 1 })).toBe(
      "週1回 ・ チェック",
    );
    expect(
      habitCaption({ ...base, period: "monthly", timesPerPeriod: 8 }),
    ).toBe("月8回 ・ チェック");
  });

  it("量の習慣は単位・目標・回ごとに足すを出す", () => {
    expect(
      habitCaption({
        ...base,
        recordType: "quantity",
        unit: "回",
        quantityTarget: 30,
        inputMode: "total",
      }),
    ).toBe("量（回） ・ 目標 30 回");
    expect(
      habitCaption({
        ...base,
        period: "weekly",
        recordType: "quantity",
        unit: "km",
        quantityTarget: 10,
        inputMode: "increment",
      }),
    ).toBe("量（km） ・ 目標 10 km ・ 回ごとに足す");
  });

  it("量の目標がなければ目標を省く", () => {
    expect(
      habitCaption({
        ...base,
        recordType: "quantity",
        unit: "ページ",
        inputMode: "total",
      }),
    ).toBe("量（ページ）");
  });
});

describe("formatJapaneseDate", () => {
  it("年月日にする（先頭の 0 は付けない）", () => {
    expect(formatJapaneseDate("2024-11-05")).toBe("2024年11月5日");
  });
});
