import { describe, expect, it } from "vitest";
import { addDays, datesInRange } from "./date";
import { d, makeEntries, makeEntry, makeHabit } from "./fixtures";
import {
  currentStreak,
  isPersonalBest,
  longestStreak,
  overTargetStreak,
  type StreakInput,
} from "./streak";
import type { Entry, Habit, WeekStart } from "./types";

const input = (
  habit: Habit,
  entries: Entry[],
  today: string,
  weekStart: WeekStart = "mon",
): StreakInput => ({ habit, entries, today: d(today), weekStart });

/** start から end まで毎日の記録 */
const everyDay = (habitId: string, start: string, end: string) =>
  makeEntries(habitId, datesInRange({ start: d(start), end: d(end) }));

describe("currentStreak：日次", () => {
  const habit = makeHabit({ createdOn: d("2024-10-01") });

  it("今日も記録していれば今日を含めて数える", () => {
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-06");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(6);
  });

  it("今日がまだ未達成でも途切れさせない", () => {
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-05");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(5);
  });

  it("昨日が未達成なら途切れる", () => {
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-04");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(0);
    entries.push(makeEntry(habit.id, "2024-11-06"));
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(1);
  });

  it("記録がなければ 0", () => {
    expect(currentStreak(input(habit, [], "2024-11-06"))).toBe(0);
  });

  it("作った日より前は数えない", () => {
    const created = makeHabit({ createdOn: d("2024-11-03") });
    const entries = everyDay(created.id, "2024-10-25", "2024-11-06");
    expect(currentStreak(input(created, entries, "2024-11-06"))).toBe(4);
  });

  it("作った日より前の今日なら 0", () => {
    const future = makeHabit({ createdOn: d("2024-12-01") });
    expect(currentStreak(input(future, [], "2024-11-06"))).toBe(0);
    expect(longestStreak(input(future, [], "2024-11-06"))).toBe(0);
  });

  it("月・年・うるう日をまたいで続く", () => {
    const entries = everyDay(habit.id, "2024-02-27", "2024-03-02");
    const h = makeHabit({ id: habit.id, createdOn: d("2024-01-01") });
    expect(currentStreak(input(h, entries, "2024-03-02"))).toBe(5);
    const year = everyDay(habit.id, "2024-12-30", "2025-01-02");
    expect(currentStreak(input(h, year, "2025-01-02"))).toBe(4);
  });

  it("ほかの習慣の記録は数えない", () => {
    const entries = everyDay("other", "2024-11-01", "2024-11-06");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(0);
  });

  it("日次・量：目標に届かない日で途切れる", () => {
    const qty = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "total",
      createdOn: d("2024-10-01"),
    });
    const entries = [
      makeEntry(qty.id, "2024-11-03", 30),
      makeEntry(qty.id, "2024-11-04", 29),
      makeEntry(qty.id, "2024-11-05", 40),
      makeEntry(qty.id, "2024-11-06", 31),
    ];
    expect(currentStreak(input(qty, entries, "2024-11-06"))).toBe(2);
  });
});

describe("currentStreak：過去の習慣", () => {
  it("過去の習慣にしている習慣は 0", () => {
    const habit = makeHabit({
      createdOn: d("2024-10-01"),
      archivedOn: d("2024-11-05"),
    });
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-06");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(0);
  });

  it("過去にする日がまだ先なら、それまでは数える", () => {
    const habit = makeHabit({
      createdOn: d("2024-10-01"),
      archivedOn: d("2024-11-10"),
    });
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-06");
    expect(currentStreak(input(habit, entries, "2024-11-06"))).toBe(6);
  });

  it("最長連続では、過去にした日以降の記録を数えない", () => {
    const habit = makeHabit({
      createdOn: d("2024-10-01"),
      archivedOn: d("2024-11-04"),
    });
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-10");
    expect(longestStreak(input(habit, entries, "2024-11-10"))).toBe(3);
  });
});

describe("currentStreak：週次・月次", () => {
  const weekly = makeHabit({
    period: "weekly",
    timesPerPeriod: 2,
    createdOn: d("2024-10-01"),
  });
  // 10/14週・10/21週・10/28週 にそれぞれ2日
  const threeWeeks = makeEntries(weekly.id, [
    "2024-10-14",
    "2024-10-15",
    "2024-10-22",
    "2024-10-27", // 日曜（mon 始まりなら 10/21 の週）
    "2024-10-28",
    "2024-10-29",
  ]);

  it("今週がまだ未達成でも途切れさせない", () => {
    expect(currentStreak(input(weekly, threeWeeks, "2024-11-06"))).toBe(3);
  });

  it("今週も達成していれば含める", () => {
    const entries = [
      ...threeWeeks,
      ...makeEntries(weekly.id, ["2024-11-04", "2024-11-05"]),
    ];
    expect(currentStreak(input(weekly, entries, "2024-11-06"))).toBe(4);
  });

  it("週の始まり sun では区切りが変わる", () => {
    // sun 始まり：10/13週 {14,15}・10/20週 {22}・10/27週 {27,28,29}
    expect(currentStreak(input(weekly, threeWeeks, "2024-11-06", "sun"))).toBe(
      1,
    );
    expect(longestStreak(input(weekly, threeWeeks, "2024-11-06", "sun"))).toBe(
      1,
    );
  });

  it("作った日を含む週は、作った日より前の記録を数えない", () => {
    const created = makeHabit({
      period: "weekly",
      timesPerPeriod: 2,
      createdOn: d("2024-10-15"),
    });
    const entries = makeEntries(created.id, [
      "2024-10-14", // 作る前
      "2024-10-15",
      "2024-10-22",
      "2024-10-23",
    ]);
    expect(currentStreak(input(created, entries, "2024-10-24"))).toBe(1);
  });

  it("月次：うるう年の2月をまたぐ", () => {
    const monthly = makeHabit({
      period: "monthly",
      timesPerPeriod: 1,
      createdOn: d("2023-12-15"),
    });
    const entries = makeEntries(monthly.id, [
      "2023-12-31",
      "2024-01-31",
      "2024-02-29",
    ]);
    expect(currentStreak(input(monthly, entries, "2024-03-15"))).toBe(3);
    expect(currentStreak(input(monthly, entries, "2024-04-01"))).toBe(0);
  });
});

describe("longestStreak / isPersonalBest", () => {
  const habit = makeHabit({ createdOn: d("2024-10-01") });

  it("過去の最も長い連続を返す", () => {
    const entries = [
      ...everyDay(habit.id, "2024-10-01", "2024-10-10"), // 10日
      ...everyDay(habit.id, "2024-11-01", "2024-11-05"), // 5日
    ];
    const i = input(habit, entries, "2024-11-06");
    expect(longestStreak(i)).toBe(10);
    expect(currentStreak(i)).toBe(5);
    expect(isPersonalBest(i)).toBe(false);
  });

  it("いまの連続が最長で 2 以上なら自己ベスト更新中", () => {
    const entries = everyDay(habit.id, "2024-11-01", "2024-11-06");
    const i = input(habit, entries, "2024-11-06");
    expect(longestStreak(i)).toBe(6);
    expect(isPersonalBest(i)).toBe(true);
  });

  it("連続 1 では自己ベストにしない", () => {
    const entries = makeEntries(habit.id, ["2024-11-06"]);
    expect(isPersonalBest(input(habit, entries, "2024-11-06"))).toBe(false);
  });

  it("記録がなければ 0", () => {
    expect(longestStreak(input(habit, [], "2024-11-06"))).toBe(0);
  });

  it("作った日だけ記録した", () => {
    const created = makeHabit({ createdOn: d("2024-11-06") });
    const entries = makeEntries(created.id, ["2024-11-06"]);
    expect(longestStreak(input(created, entries, "2024-11-06"))).toBe(1);
    expect(currentStreak(input(created, entries, "2024-11-06"))).toBe(1);
  });

  it("1年分でも計算できる", () => {
    const yearHabit = makeHabit({ createdOn: d("2023-01-01") });
    const entries = everyDay(yearHabit.id, "2023-01-01", "2024-12-31");
    const i = input(yearHabit, entries, "2024-12-31");
    expect(longestStreak(i)).toBe(731);
    expect(currentStreak(i)).toBe(731);
  });
});

describe("overTargetStreak", () => {
  const qty = makeHabit({
    recordType: "quantity",
    unit: "回",
    quantityTarget: 30,
    inputMode: "increment",
    createdOn: d("2024-10-01"),
  });

  it("目標を超えた日が続いた数（ちょうどは超えていない）", () => {
    const entries = [
      makeEntry(qty.id, "2024-11-02", 35),
      makeEntry(qty.id, "2024-11-03", 30), // ちょうど
      makeEntry(qty.id, "2024-11-04", 31),
      makeEntry(qty.id, "2024-11-05", 20),
      makeEntry(qty.id, "2024-11-05", 20),
      makeEntry(qty.id, "2024-11-06", 45),
    ];
    expect(overTargetStreak(input(qty, entries, "2024-11-06"))).toBe(3);
    // 今日がまだ超えていなくても途切れさせない
    expect(
      overTargetStreak(input(qty, entries.slice(0, 5), "2024-11-06")),
    ).toBe(2);
  });

  it("日次の量の習慣で目標があるとき以外は 0", () => {
    const noTarget = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: null,
      inputMode: "total",
    });
    const weekly = makeHabit({
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "total",
    });
    const check = makeHabit();
    const today = "2024-11-06";
    const entriesFor = (h: Habit) => [makeEntry(h.id, today, 100)];
    expect(overTargetStreak(input(noTarget, entriesFor(noTarget), today))).toBe(
      0,
    );
    expect(overTargetStreak(input(weekly, entriesFor(weekly), today))).toBe(0);
    expect(overTargetStreak(input(check, entriesFor(check), today))).toBe(0);
  });

  it("addDays との整合（さかのぼりが作った日で止まる）", () => {
    const created = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: 1,
      inputMode: "total",
      createdOn: d("2024-11-04"),
    });
    const entries = [-3, -2, -1, 0].map((offset) =>
      makeEntry(created.id, addDays(d("2024-11-06"), offset), 5),
    );
    // 11/3 は作る前、11/4・5・6 の3日
    expect(overTargetStreak(input(created, entries, "2024-11-06"))).toBe(3);
  });
});
