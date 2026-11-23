import { describe, expect, it } from "vitest";
import { d, makeEntry, makeHabit } from "./fixtures";
import { normalizeNote, noteLength, previousQuantity } from "./note";

describe("noteLength", () => {
  it("日本語も絵文字も1文字と数える", () => {
    expect(noteLength("読書")).toBe(2);
    expect(noteLength("😴zz")).toBe(3);
  });
});

describe("normalizeNote", () => {
  it("前後の空白を除く", () => {
    expect(normalizeNote("  雨の中 5km \n")).toBe("雨の中 5km");
  });

  it("空白だけなら null（消す）", () => {
    expect(normalizeNote(" \n ")).toBeNull();
    expect(normalizeNote("")).toBeNull();
  });
});

describe("previousQuantity", () => {
  const total = makeHabit({
    recordType: "quantity",
    unit: "回",
    inputMode: "total",
  });
  const increment = makeHabit({
    recordType: "quantity",
    unit: "km",
    inputMode: "increment",
    period: "weekly",
  });

  it("チェックのみの習慣は null", () => {
    const check = makeHabit();
    expect(
      previousQuantity(
        check,
        [makeEntry(check.id, "2024-11-01")],
        d("2024-11-02"),
      ),
    ).toBeNull();
  });

  it("合計を入力：記録する日より前の、いちばん新しい日の合計", () => {
    const entries = [
      makeEntry(total.id, "2024-10-30", 20),
      makeEntry(total.id, "2024-10-31", 25),
      makeEntry(total.id, "2024-11-01", 30),
    ];
    expect(previousQuantity(total, entries, d("2024-11-01"))).toBe(25);
    expect(previousQuantity(total, entries, d("2024-11-02"))).toBe(30);
  });

  it("回ごとに足す：その日の分も含めて、いちばん新しい1回分", () => {
    const entries = [
      makeEntry(increment.id, "2024-10-28", 3.2),
      makeEntry(increment.id, "2024-11-01", 2.5),
    ];
    expect(previousQuantity(increment, entries, d("2024-11-01"))).toBe(2.5);
    expect(previousQuantity(increment, entries, d("2024-10-30"))).toBe(3.2);
  });

  it("記録する日より後の記録は使わない（② で過去の日を開いたとき）", () => {
    const entries = [makeEntry(total.id, "2024-11-05", 40)];
    expect(previousQuantity(total, entries, d("2024-11-01"))).toBeNull();
  });

  it("前回がなければ null", () => {
    expect(previousQuantity(total, [], d("2024-11-01"))).toBeNull();
  });
});
