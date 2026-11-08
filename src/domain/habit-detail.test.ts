import { describe, expect, it } from "vitest";
import { d, makeEntries, makeEntry, makeHabit } from "./fixtures";
import {
  buildHabitStats,
  habitDetailGrassRange,
  habitDetailGrumbleScene,
  selectHabitDetailGrumble,
} from "./habit-detail";

describe("habitDetailGrassRange", () => {
  it("現在の習慣は、今日までの365日", () => {
    const habit = makeHabit();
    expect(habitDetailGrassRange(habit, d("2024-11-06"))).toEqual({
      start: "2023-11-08",
      end: "2024-11-06",
    });
  });

  it("過去の習慣は、過去にした日の前の日まで", () => {
    const habit = makeHabit({ archivedOn: d("2024-03-01") });
    expect(habitDetailGrassRange(habit, d("2024-11-06"))).toEqual({
      start: "2023-03-02",
      end: "2024-02-29",
    });
  });
});

describe("buildHabitStats", () => {
  const today = d("2024-11-06");

  it("日次・量：今月は目標を達成した日数", () => {
    const habit = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "total",
    });
    const entries = [
      makeEntry(habit.id, "2024-11-01", 30),
      makeEntry(habit.id, "2024-11-02", 10),
      makeEntry(habit.id, "2024-11-03", 40.5),
      makeEntry(habit.id, "2023-12-31", 99),
    ];
    const stats = buildHabitStats(
      { habit, entries, today, weekStart: "mon" },
      3,
    );
    expect(stats[1]).toEqual({ label: "今月", value: "2", unit: "/ 30日" });
    expect(stats[2]).toEqual({
      label: "今年の合計",
      value: "80.5",
      unit: "回",
    });
  });

  it("月次・チェック：今月の記録のある日数 / 回数の目標", () => {
    const habit = makeHabit({ period: "monthly", timesPerPeriod: 3 });
    const entries = makeEntries(habit.id, ["2024-11-01", "2024-11-03"]);
    const stats = buildHabitStats(
      { habit, entries, today, weekStart: "mon" },
      0,
    );
    expect(stats[0]).toEqual({ label: "最長連続", value: "0", unit: "か月" });
    expect(stats[1]).toEqual({ label: "今月", value: "2", unit: "/ 3回" });
  });

  it("週次・量（目標なし）：今週の合計だけ", () => {
    const habit = makeHabit({
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: null,
      inputMode: "increment",
    });
    const entries = [
      makeEntry(habit.id, "2024-11-04", 0.1),
      makeEntry(habit.id, "2024-11-05", 0.2),
    ];
    const stats = buildHabitStats(
      { habit, entries, today, weekStart: "mon" },
      1,
    );
    expect(stats[1]).toEqual({ label: "今週", value: "0.3", unit: "km" });
  });

  it("ほかの習慣の記録は数えない", () => {
    const habit = makeHabit();
    const entries = makeEntries("other", ["2024-11-01", "2024-11-02"]);
    const stats = buildHabitStats(
      { habit, entries, today, weekStart: "mon" },
      0,
    );
    expect(stats[1]?.value).toBe("0");
    expect(stats[2]?.value).toBe("0");
  });
});

describe("habitDetailGrumbleScene", () => {
  const habit = makeHabit();
  const base = {
    habit,
    currentStreak: 0,
    isPersonalBest: false,
    hasRecords: false,
    today: d("2024-11-06"),
  };

  it("上から順に判定する", () => {
    expect(
      habitDetailGrumbleScene({
        ...base,
        habit: makeHabit({ archivedOn: d("2024-11-01") }),
        isPersonalBest: true,
      }),
    ).toBe("archived");
    expect(
      habitDetailGrumbleScene({
        ...base,
        currentStreak: 5,
        isPersonalBest: true,
      }),
    ).toBe("best");
    expect(habitDetailGrumbleScene({ ...base, currentStreak: 1 })).toBe(
      "streak",
    );
    expect(habitDetailGrumbleScene({ ...base, hasRecords: true })).toBe(
      "recorded",
    );
    expect(habitDetailGrumbleScene(base)).toBe("empty");
  });

  it("テンプレートの値を差し込み、同じ日なら同じセリフ", () => {
    const input = { ...base, currentStreak: 27, isPersonalBest: true };
    const a = selectHabitDetailGrumble(input);
    expect(a.expression).toBe("happy");
    expect(a.text).not.toMatch(/\{\w+\}/);
    expect(selectHabitDetailGrumble(input)).toEqual(a);
  });
});
