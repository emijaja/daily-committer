import { describe, expect, it } from "vitest";
import { datesInRange } from "./date";
import { d, makeEntries, makeEntry, makeHabit } from "./fixtures";
import {
  buildAchievements,
  buildAlmostThere,
  type ReviewInput,
  type ReviewItem,
} from "./review";
import type { Entry, Habit, WeekStart } from "./types";

const TODAY = "2024-11-06"; // 水曜

const review = (
  habits: Habit[],
  entries: Entry[],
  today = TODAY,
  weekStart: WeekStart = "mon",
): ReviewInput => ({ habits, entries, today: d(today), weekStart });

const everyDay = (habitId: string, start: string, end: string) =>
  makeEntries(habitId, datesInRange({ start: d(start), end: d(end) }));

const text = (item: ReviewItem | undefined) =>
  (item?.segments ?? []).map((s) => s.text).join("");
const emphasized = (item: ReviewItem | undefined) =>
  (item?.segments ?? []).filter((s) => s.emphasis).map((s) => s.text);

const created = d("2024-01-01");

describe("buildAchievements", () => {
  it("日次の連続：3日以上で出す（2日では出さない）", () => {
    const reading = makeHabit({ name: "読書", createdOn: created });
    const two = buildAchievements(
      review([reading], everyDay(reading.id, "2024-11-05", "2024-11-06")),
    );
    expect(two).toEqual([]);

    const items = buildAchievements(
      review([reading], everyDay(reading.id, "2024-11-04", "2024-11-06")),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      habitId: reading.id,
      kind: "dailyStreak",
      score: 3,
      figure: { value: 3, unit: "日", caption: "連続" },
    });
    expect(text(items[0])).toBe("読書を 3日 連続で続けています");
    expect(emphasized(items[0])).toEqual(["3日"]);
  });

  it("目標超えの連続：2日以上。日次の連続より長ければ（同じなら）目標超えを出す", () => {
    const workout = makeHabit({
      name: "筋トレ",
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "increment",
      createdOn: created,
    });
    const entries = [
      makeEntry(workout.id, "2024-11-05", 40),
      makeEntry(workout.id, "2024-11-06", 35),
    ];
    const items = buildAchievements(review([workout], entries));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "overTargetStreak",
      score: 2,
      figure: { value: 2, unit: "日", caption: "目標超え" },
    });
    expect(text(items[0])).toBe("筋トレで 目標超え が 2日連続");

    // 4日連続達成、うち目標超えは直近2日 → 長い日次の連続を出す（1習慣1件）
    const longer = [
      makeEntry(workout.id, "2024-11-03", 30),
      makeEntry(workout.id, "2024-11-04", 30),
      ...entries,
    ];
    const items2 = buildAchievements(review([workout], longer));
    expect(items2).toHaveLength(1);
    expect(items2[0]?.kind).toBe("dailyStreak");
    expect(items2[0]?.score).toBe(4);

    // 3日すべて目標超え → 同じ長さなので目標超え
    const allOver = [makeEntry(workout.id, "2024-11-04", 31), ...entries];
    expect(buildAchievements(review([workout], allOver))[0]?.kind).toBe(
      "overTargetStreak",
    );
  });

  it("週次・月次のペース：2期間以上の連続達成。7日・30日換算で比べる", () => {
    const running = makeHabit({
      name: "ランニング",
      period: "weekly",
      timesPerPeriod: 3,
      createdOn: created,
      sortOrder: 1,
    });
    const gym = makeHabit({
      name: "ジム",
      period: "monthly",
      timesPerPeriod: 1,
      createdOn: created,
      sortOrder: 2,
    });
    const reading = makeHabit({
      name: "読書",
      createdOn: created,
      sortOrder: 0,
    });
    const entries = [
      // ランニング：10/21週・10/28週に3日ずつ → 2週（14日換算）
      ...makeEntries(running.id, [
        "2024-10-21",
        "2024-10-23",
        "2024-10-25",
        "2024-10-28",
        "2024-10-30",
        "2024-11-01",
      ]),
      // ジム：9月・10月 → 2か月（60日換算）
      ...makeEntries(gym.id, ["2024-09-10", "2024-10-10"]),
      // 読書：20日連続
      ...everyDay(reading.id, "2024-10-18", "2024-11-06"),
    ];
    const items = buildAchievements(review([running, gym, reading], entries));
    expect(items.map((i) => [i.kind, i.score])).toEqual([
      ["periodPace", 60],
      ["dailyStreak", 20],
      ["periodPace", 14],
    ]);
    expect(text(items[0])).toBe("ジムを 月1回ペース で継続中");
    expect(items[0]?.figure).toEqual({
      value: 2,
      unit: "か月",
      caption: "連続",
    });
    expect(text(items[2])).toBe("ランニングを 週3回ペース で継続中");
    expect(emphasized(items[2])).toEqual(["週3回ペース"]);
    expect(items[2]?.figure.unit).toBe("週");
  });

  it("量の週次・月次のペースの表し方", () => {
    const km = makeHabit({
      name: "ランニング",
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "total",
      createdOn: created,
    });
    const books = makeHabit({
      name: "本",
      period: "weekly",
      recordType: "quantity",
      unit: "冊",
      quantityTarget: null,
      inputMode: "total",
      createdOn: created,
    });
    const entries = [
      makeEntry(km.id, "2024-10-21", 10),
      makeEntry(km.id, "2024-10-28", 12),
      makeEntry(books.id, "2024-10-21", 1),
      makeEntry(books.id, "2024-10-28", 1),
    ];
    const items = buildAchievements(review([km, books], entries));
    expect(items.map(text)).toEqual([
      "ランニングを 週10kmペース で継続中",
      "本を 週1回以上ペース で継続中",
    ]);
  });

  it("1期間だけの週次は出さない。過去の習慣・作る前の習慣は対象外", () => {
    const weekly = makeHabit({
      period: "weekly",
      timesPerPeriod: 1,
      createdOn: created,
    });
    const archived = makeHabit({
      createdOn: created,
      archivedOn: d("2024-11-06"),
    });
    const future = makeHabit({ createdOn: d("2024-12-01") });
    const entries = [
      makeEntry(weekly.id, "2024-10-28"),
      ...everyDay(archived.id, "2024-10-01", "2024-11-05"),
      ...everyDay(future.id, "2024-10-01", "2024-11-06"),
    ];
    expect(
      buildAchievements(review([weekly, archived, future], entries)),
    ).toEqual([]);
  });

  it("同じ長さなら習慣の並び順", () => {
    const a = makeHabit({ name: "A", createdOn: created, sortOrder: 2 });
    const b = makeHabit({ name: "B", createdOn: created, sortOrder: 1 });
    const entries = [
      ...everyDay(a.id, "2024-11-01", "2024-11-06"),
      ...everyDay(b.id, "2024-11-01", "2024-11-06"),
    ];
    const items = buildAchievements(review([a, b], entries));
    expect(items.map((i) => i.habitId)).toEqual([b.id, a.id]);
  });
});

describe("buildAlmostThere：連続の節目", () => {
  const reading = makeHabit({ name: "読書", createdOn: created });

  it("次の節目まであと3日以内で出す", () => {
    // 27日連続 → あと3日で30日
    const entries = everyDay(reading.id, "2024-10-11", "2024-11-06");
    const items = buildAlmostThere(review([reading], entries));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "milestone",
      score: 27,
      figure: { value: 3, unit: "日", caption: "あと" },
    });
    expect(text(items[0])).toBe("あと3日続けると、読書が 30日連続");
    expect(emphasized(items[0])).toEqual(["30日連続"]);
  });

  it("あと4日以上なら出さない", () => {
    // 26日連続 → あと4日
    const entries = everyDay(reading.id, "2024-10-12", "2024-11-06");
    expect(buildAlmostThere(review([reading], entries))).toEqual([]);
  });

  it("今日がまだでも、昨日までの連続で数える", () => {
    // 昨日まで6日連続 → あと1日で7日
    const entries = everyDay(reading.id, "2024-10-31", "2024-11-05");
    const items = buildAlmostThere(review([reading], entries));
    expect(text(items[0])).toBe("あと1日続けると、読書が 7日連続");
  });

  it("連続 0、節目ちょうど、365日を超えたら出さない", () => {
    expect(buildAlmostThere(review([reading], []))).toEqual([]);
    // 7日ちょうど → 次は14日（あと7日）
    const seven = everyDay(reading.id, "2024-10-31", "2024-11-06");
    expect(buildAlmostThere(review([reading], seven))).toEqual([]);
    const long = everyDay(reading.id, "2023-01-01", "2024-11-06");
    expect(buildAlmostThere(review([reading], long))).toEqual([]);
  });
});

describe("buildAlmostThere：今期の目標", () => {
  const running = makeHabit({
    name: "ランニング",
    period: "weekly",
    timesPerPeriod: 3,
    createdOn: created,
  });

  it("あと1〜2回で、期間が残っていれば出す", () => {
    const entries = makeEntries(running.id, ["2024-11-04", "2024-11-05"]);
    const items = buildAlmostThere(review([running], entries));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "periodGoal",
      figure: { value: 1, unit: "回", caption: "あと" },
    });
    expect(text(items[0])).toBe("あと1回で、今週のランニング目標を達成");
    expect(emphasized(items[0])).toEqual(["あと1回"]);
  });

  it("あと3回以上・達成済みなら出さない", () => {
    expect(buildAlmostThere(review([running], []))).toEqual([]);
    const done = makeEntries(running.id, [
      "2024-11-04",
      "2024-11-05",
      "2024-11-06",
    ]);
    expect(buildAlmostThere(review([running], done))).toEqual([]);
  });

  it("残りの日数で間に合わなければ出さない（今日記録済みの日は数えない）", () => {
    // 日曜（mon 始まりの週の最後の日）、記録1日 → あと2回だが今日しか残っていない
    const sunday = "2024-11-10";
    const one = makeEntries(running.id, ["2024-11-04"]);
    expect(buildAlmostThere(review([running], one, sunday))).toEqual([]);
    // 記録2日 → あと1回、今日記録すれば間に合う
    const two = makeEntries(running.id, ["2024-11-04", "2024-11-05"]);
    expect(buildAlmostThere(review([running], two, sunday))).toHaveLength(1);
    // 土曜、記録1日（うち今日）→ あと2回だが残りは日曜の1日だけ
    const today = makeEntries(running.id, ["2024-11-09"]);
    expect(buildAlmostThere(review([running], today, "2024-11-09"))).toEqual(
      [],
    );
  });

  it("週の始まり sun では週の終わりが土曜になる", () => {
    // sun 始まり：11/3〜11/9。土曜 11/9 で記録2日 → あと1回、今日で間に合う
    const entries = makeEntries(running.id, ["2024-11-03", "2024-11-04"]);
    expect(
      buildAlmostThere(review([running], entries, "2024-11-09", "sun")),
    ).toHaveLength(1);
    // mon 始まりなら 11/3 は前の週 → あと2回、11/9・10 で間に合う
    expect(
      buildAlmostThere(review([running], entries, "2024-11-09", "mon")),
    ).toHaveLength(1);
  });

  it("月次は今月、作った日より前の記録は数えない、量の習慣は対象外", () => {
    const gym = makeHabit({
      name: "ジム",
      period: "monthly",
      timesPerPeriod: 4,
      createdOn: d("2024-11-03"),
    });
    const qty = makeHabit({
      period: "monthly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "total",
      createdOn: created,
    });
    const entries = [
      ...makeEntries(gym.id, ["2024-11-01", "2024-11-03", "2024-11-04"]),
      makeEntry(qty.id, "2024-11-01", 9),
    ];
    const items = buildAlmostThere(review([gym, qty], entries));
    expect(items).toHaveLength(1);
    expect(text(items[0])).toBe("あと2回で、今月のジム目標を達成");
  });

  it("連続の長い順（週次は7日換算）", () => {
    const reading = makeHabit({ name: "読書", createdOn: created });
    const entries = [
      // 読書：6日連続（score 6）
      ...everyDay(reading.id, "2024-10-31", "2024-11-05"),
      // ランニング：前の週に達成（1週 = 7日換算）、今週あと1回
      ...makeEntries(running.id, [
        "2024-10-28",
        "2024-10-29",
        "2024-10-30",
        "2024-11-04",
        "2024-11-05",
      ]),
    ];
    const items = buildAlmostThere(review([reading, running], entries));
    expect(items.map((i) => [i.kind, i.score])).toEqual([
      ["periodGoal", 7],
      ["milestone", 6],
    ]);
  });
});
