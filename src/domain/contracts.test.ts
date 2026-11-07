import { describe, expect, it } from "vitest";
import { compareDates } from "./date";
import { d, makeHabit } from "./fixtures";

describe("契約とテスト用データ", () => {
  it("makeHabit は既定値で日次・チェックのみの習慣を作る", () => {
    const habit = makeHabit({ name: "早起き" });
    expect(habit).toMatchObject({
      name: "早起き",
      period: "daily",
      recordType: "check",
    });
  });

  it("LogicalDate は文字列のまま比較できる", () => {
    expect(compareDates(d("2024-10-29"), d("2024-11-01"))).toBe(-1);
  });
});
