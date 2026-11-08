import { describe, expect, it } from "vitest";
import { evaluatePeriod, summarize } from "./achievement";
import { periodRange } from "./date";
import { d, makeEntries, makeEntry, makeHabit } from "./fixtures";
import { isActiveOn } from "./habit";

const day = (date: string) => periodRange("daily", d(date), "mon");
const week = (date: string) => periodRange("weekly", d(date), "mon");
const month = (date: string) => periodRange("monthly", d(date), "mon");

describe("evaluatePeriod：日次・チェックのみ", () => {
  const habit = makeHabit();

  it("記録があれば達成", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-06")],
      day("2024-11-06"),
    );
    expect(p).toMatchObject({
      habitId: habit.id,
      measure: "days",
      current: 1,
      target: 1,
      achieved: true,
      overBy: null,
      remaining: null,
      recordedDates: ["2024-11-06"],
    });
  });

  it("記録がなければ未達成で残り1", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-05")],
      day("2024-11-06"),
    );
    expect(p).toMatchObject({
      current: 0,
      achieved: false,
      remaining: 1,
      recordedDates: [],
    });
  });

  it("ほかの習慣の記録は数えない", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry("other", "2024-11-06")],
      day("2024-11-06"),
    );
    expect(p.achieved).toBe(false);
  });
});

describe("evaluatePeriod：日次・量", () => {
  const habit = makeHabit({
    recordType: "quantity",
    unit: "回",
    quantityTarget: 30,
    inputMode: "increment",
  });

  it("合計が目標ちょうどなら達成、目標超えなし", () => {
    const entries = [
      makeEntry(habit.id, "2024-11-06", 10),
      makeEntry(habit.id, "2024-11-06", 20),
    ];
    const p = evaluatePeriod(habit, entries, day("2024-11-06"));
    expect(p).toMatchObject({
      measure: "quantity",
      current: 30,
      target: 30,
      achieved: true,
      overBy: null,
      remaining: null,
      recordedDates: ["2024-11-06"],
    });
  });

  it("目標を超えたら超えた分を返す", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-06", 45)],
      day("2024-11-06"),
    );
    expect(p).toMatchObject({ achieved: true, overBy: 15, remaining: null });
  });

  it("目標に届かなければ残りを返す", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-06", 29.5)],
      day("2024-11-06"),
    );
    expect(p).toMatchObject({ achieved: false, overBy: null, remaining: 0.5 });
  });

  it("目標なし：量が 0 より大きければ達成", () => {
    const noTarget = makeHabit({
      recordType: "quantity",
      unit: "km",
      quantityTarget: null,
      inputMode: "total",
    });
    const zero = evaluatePeriod(
      noTarget,
      [makeEntry(noTarget.id, "2024-11-06", 0)],
      day("2024-11-06"),
    );
    expect(zero).toMatchObject({
      achieved: false,
      target: null,
      remaining: null,
      overBy: null,
    });
    const some = evaluatePeriod(
      noTarget,
      [makeEntry(noTarget.id, "2024-11-06", 3)],
      day("2024-11-06"),
    );
    expect(some.achieved).toBe(true);
  });

  it("小数の合計の誤差を丸める", () => {
    const km = makeHabit({
      recordType: "quantity",
      unit: "km",
      quantityTarget: 0.3,
      inputMode: "increment",
    });
    const p = evaluatePeriod(
      km,
      [
        makeEntry(km.id, "2024-11-06", 0.1),
        makeEntry(km.id, "2024-11-06", 0.2),
      ],
      day("2024-11-06"),
    );
    expect(p.current).toBe(0.3);
    expect(p.achieved).toBe(true);
    expect(p.overBy).toBeNull();
  });

  it("quantity が null の記録は 0 として扱う", () => {
    const p = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-06", null)],
      day("2024-11-06"),
    );
    expect(p.current).toBe(0);
  });
});

describe("evaluatePeriod：週次・月次・チェックのみ", () => {
  const habit = makeHabit({ period: "weekly", timesPerPeriod: 3 });

  it("記録のある日数が目標ちょうどなら達成", () => {
    const entries = makeEntries(habit.id, [
      "2024-11-04",
      "2024-11-06",
      "2024-11-10", // 日曜（mon 始まりの週の最後）
      "2024-11-11", // 次の週
    ]);
    const p = evaluatePeriod(habit, entries, week("2024-11-06"));
    expect(p).toMatchObject({
      measure: "days",
      current: 3,
      target: 3,
      achieved: true,
      remaining: null,
      recordedDates: ["2024-11-04", "2024-11-06", "2024-11-10"],
    });
  });

  it("同じ日の記録は1日と数える", () => {
    const entries = makeEntries(habit.id, ["2024-11-04", "2024-11-04"]);
    const p = evaluatePeriod(habit, entries, week("2024-11-06"));
    expect(p).toMatchObject({ current: 1, achieved: false, remaining: 2 });
  });

  it("週の始まり sun では日曜が次の週になる", () => {
    const entries = makeEntries(habit.id, [
      "2024-11-04",
      "2024-11-06",
      "2024-11-10",
    ]);
    const p = evaluatePeriod(
      habit,
      entries,
      periodRange("weekly", d("2024-11-06"), "sun"),
    );
    expect(p.current).toBe(2);
    expect(p.achieved).toBe(false);
  });

  it("月次：月末・うるう日の記録も含む", () => {
    const monthly = makeHabit({ period: "monthly", timesPerPeriod: 2 });
    const entries = makeEntries(monthly.id, [
      "2024-01-31",
      "2024-02-01",
      "2024-02-29",
      "2024-03-01",
    ]);
    const p = evaluatePeriod(monthly, entries, month("2024-02-10"));
    expect(p).toMatchObject({ current: 2, target: 2, achieved: true });
  });

  it("timesPerPeriod が未設定なら 1 回とみなす", () => {
    const broken = makeHabit({ period: "weekly", timesPerPeriod: null });
    const p = evaluatePeriod(
      broken,
      [makeEntry(broken.id, "2024-11-05")],
      week("2024-11-05"),
    );
    expect(p).toMatchObject({ target: 1, achieved: true });
  });
});

describe("evaluatePeriod：週次・月次・量", () => {
  it("目標あり：期間の合計で判定する", () => {
    const habit = makeHabit({
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "total",
    });
    const entries = [
      makeEntry(habit.id, "2024-11-04", 3.1),
      makeEntry(habit.id, "2024-11-06", 3.1),
    ];
    const p = evaluatePeriod(habit, entries, week("2024-11-06"));
    expect(p).toMatchObject({
      current: 6.2,
      target: 10,
      achieved: false,
      remaining: 3.8,
      recordedDates: ["2024-11-04", "2024-11-06"],
    });

    const more = [...entries, makeEntry(habit.id, "2024-11-09", 5)];
    expect(evaluatePeriod(habit, more, week("2024-11-06"))).toMatchObject({
      achieved: true,
      overBy: 1.2,
    });
  });

  it("目標なし：1日でも記録があれば達成（量が 0 でも）", () => {
    const habit = makeHabit({
      period: "monthly",
      recordType: "quantity",
      unit: "冊",
      quantityTarget: null,
      inputMode: "total",
    });
    const none = evaluatePeriod(habit, [], month("2024-11-06"));
    expect(none).toMatchObject({ achieved: false, remaining: null });
    const one = evaluatePeriod(
      habit,
      [makeEntry(habit.id, "2024-11-30", 0)],
      month("2024-11-06"),
    );
    expect(one.achieved).toBe(true);
  });
});

describe("summarize", () => {
  it("達成した数と全体の数", () => {
    const a = makeHabit();
    const b = makeHabit();
    const c = makeHabit();
    const entries = makeEntries(a.id, ["2024-11-06"]).concat(
      makeEntries(b.id, ["2024-11-06"]),
    );
    const progresses = [a, b, c].map((h) =>
      evaluatePeriod(h, entries, day("2024-11-06")),
    );
    expect(summarize(progresses)).toEqual({ done: 2, total: 3 });
    expect(summarize([])).toEqual({ done: 0, total: 0 });
  });
});

describe("isActiveOn", () => {
  it("作った日から、過去にした日の前日まで", () => {
    const habit = makeHabit({
      createdOn: d("2024-11-01"),
      archivedOn: d("2024-11-10"),
    });
    expect(isActiveOn(habit, d("2024-10-31"))).toBe(false);
    expect(isActiveOn(habit, d("2024-11-01"))).toBe(true);
    expect(isActiveOn(habit, d("2024-11-09"))).toBe(true);
    expect(isActiveOn(habit, d("2024-11-10"))).toBe(false);
    expect(isActiveOn(makeHabit(), d("2099-01-01"))).toBe(true);
  });
});
