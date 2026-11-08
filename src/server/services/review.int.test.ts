import { describe, expect, it } from "vitest";
import { datesInRange } from "@/domain/date";
import {
  checkHabit,
  createHabit,
  createUser,
  d,
  totalHabit,
} from "@/server/testing/factories";
import { archiveHabit } from "./habits";
import { setQuantityTotal, toggleCheck } from "./record";
import { getReviewView } from "./review";
import { updateSettings } from "./settings";

// 2024-11-06（水）21:00 Asia/Tokyo
const now = new Date("2024-11-06T12:00:00Z");

async function checkEveryDay(
  userId: string,
  habitId: string,
  start: string,
  end: string,
) {
  for (const date of datesInRange({ start: d(start), end: d(end) })) {
    await toggleCheck(userId, habitId, date);
  }
}

const levelOn = (grass: { date: string; level: number }[], date: string) =>
  grass.find((c) => c.date === date)?.level;

describe("getReviewView", () => {
  it("記録がなければ、草は空・件数0・文章なしで、firstRecordDate は null", async () => {
    const me = await createUser();
    await createHabit(me);

    const view = await getReviewView(me, 2024, null, now);
    expect(view.year).toBe(2024);
    expect(view.today).toBe("2024-11-06");
    expect(view.weekStart).toBe("mon");
    expect(view.grass).toHaveLength(366);
    expect(view.grass[0]?.date).toBe("2024-01-01");
    expect(view.grass.every((c) => c.level === 0)).toBe(true);
    expect(view.recordCount).toBe(0);
    expect(view.achievements).toEqual([]);
    expect(view.almostThere).toEqual([]);
    expect(view.firstRecordDate).toBeNull();
    expect(view.grumble?.expression).toBe("sleepy");
  });

  it("すべての習慣：4段階の草・件数・達成していること・もう少しで達成を domain で計算する", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit({ name: "読書" }), {
      createdOn: "2024-10-01",
      sortOrder: 0,
    });
    const early = await createHabit(me, checkHabit({ name: "早起き" }), {
      createdOn: "2024-10-01",
      sortOrder: 1,
    });
    const workout = await createHabit(me, totalHabit({ name: "筋トレ" }), {
      createdOn: "2024-10-01",
      sortOrder: 2,
    });
    // 読書：10/9〜11/6 の 29日連続（あと1日で30日の節目）
    await checkEveryDay(me, reading, "2024-10-09", "2024-11-06");
    // 早起き：11/1〜11/5 の5日（今日はまだ）
    await checkEveryDay(me, early, "2024-11-01", "2024-11-05");
    // 筋トレ：11/6 だけ
    await setQuantityTotal(me, workout, d("2024-11-06"), 20);

    const view = await getReviewView(me, 2024, null, now);

    // 11/6：3習慣中2（読書・筋トレ）→ r=2/3 → レベル2。11/5：2/3 → 2。10/20：1/3 → 1
    expect(levelOn(view.grass, "2024-11-06")).toBe(2);
    expect(levelOn(view.grass, "2024-11-05")).toBe(2);
    expect(levelOn(view.grass, "2024-10-20")).toBe(1);
    expect(levelOn(view.grass, "2024-09-01")).toBe(0);
    expect(view.recordCount).toBe(29 + 5 + 1);
    expect(view.firstRecordDate).toBe("2024-10-09");

    expect(
      view.achievements.map((a) => [a.habitId, a.kind, a.figure.value]),
    ).toEqual([
      [reading, "dailyStreak", 29],
      [early, "dailyStreak", 5],
    ]);
    expect(
      view.almostThere.map((a) => [a.habitId, a.kind, a.figure.value]),
    ).toEqual([
      [reading, "milestone", 1],
      [early, "milestone", 2],
    ]);
    expect(view.grumble?.expression).toBe("happy");
    expect(view.habits.map((h) => h.id)).toEqual([reading, early, workout]);
  });

  it("連続は年をまたいで数える（前の年の記録も取得する）", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit(), {
      createdOn: "2023-12-01",
    });
    await checkEveryDay(me, reading, "2023-12-25", "2024-01-02");
    const jan2 = new Date("2024-01-02T03:00:00Z"); // 2024-01-02 12:00 JST

    const view = await getReviewView(me, 2024, null, jan2);
    expect(view.recordCount).toBe(2);
    expect(view.achievements[0]?.figure.value).toBe(9);
  });

  it("前の年を見るときも、文章は今日の時点の連続", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit(), {
      createdOn: "2023-01-01",
    });
    await toggleCheck(me, reading, d("2023-05-01"));
    await checkEveryDay(me, reading, "2024-11-01", "2024-11-06");

    const view = await getReviewView(me, 2023, null, now);
    expect(view.grass).toHaveLength(365);
    expect(view.recordCount).toBe(1);
    expect(levelOn(view.grass, "2023-05-01")).toBe(3);
    expect(view.achievements[0]?.figure.value).toBe(6);
    expect(view.firstRecordDate).toBe("2023-05-01");
  });

  it("習慣ごと：2値の草と、その習慣だけの件数・文章", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit({ name: "読書" }), {
      sortOrder: 0,
    });
    const early = await createHabit(me, checkHabit({ name: "早起き" }), {
      sortOrder: 1,
    });
    await checkEveryDay(me, reading, "2024-11-01", "2024-11-06");
    await checkEveryDay(me, early, "2024-11-04", "2024-11-06");

    const view = await getReviewView(me, 2024, early, now);
    expect(view.habitId).toBe(early);
    expect(levelOn(view.grass, "2024-11-04")).toBe(3);
    expect(levelOn(view.grass, "2024-11-03")).toBe(0);
    expect(view.recordCount).toBe(3);
    expect(view.achievements.map((a) => a.habitId)).toEqual([early]);
    expect(view.almostThere.every((a) => a.habitId === early)).toBe(true);
  });

  it("他人の習慣・存在しない習慣は not_found", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);
    await expect(getReviewView(me, 2024, theirs, now)).rejects.toThrow(
      "習慣が見つかりません",
    );
    await expect(getReviewView(me, 2024, "not-a-uuid", now)).rejects.toThrow(
      "習慣が見つかりません",
    );
  });

  it("他人の記録は数えない", async () => {
    const me = await createUser();
    const other = await createUser();
    await createHabit(me);
    const theirs = await createHabit(other);
    await toggleCheck(other, theirs, d("2024-11-06"));

    const view = await getReviewView(me, 2024, null, now);
    expect(view.recordCount).toBe(0);
    expect(view.firstRecordDate).toBeNull();
  });

  it("過去の習慣：草はその日に現在の習慣だった数で割り、文章には出さず、選べる習慣の後ろに並ぶ", async () => {
    const me = await createUser();
    const old = await createHabit(me, checkHabit({ name: "日記" }), {
      sortOrder: 0,
    });
    const reading = await createHabit(me, checkHabit({ name: "読書" }), {
      sortOrder: 1,
    });
    await checkEveryDay(me, old, "2024-10-25", "2024-10-31");
    await archiveHabit(me, old, now);
    await checkEveryDay(me, reading, "2024-11-04", "2024-11-06");

    const view = await getReviewView(me, 2024, null, now);
    // 10/31：2習慣中1 → レベル2。11/6：日記は過去の習慣 → 1習慣中1 → レベル3
    expect(levelOn(view.grass, "2024-10-31")).toBe(2);
    expect(levelOn(view.grass, "2024-11-06")).toBe(3);
    expect(view.recordCount).toBe(7 + 3);
    expect(view.achievements.map((a) => a.habitId)).toEqual([reading]);
    expect(view.habits.map((h) => h.id)).toEqual([reading, old]);
  });

  it("ぼやきを表示しない設定なら grumble は null", async () => {
    const me = await createUser();
    await updateSettings(me, { grumbleEnabled: false });
    const view = await getReviewView(me, 2024, null, now);
    expect(view.grumble).toBeNull();
  });

  it("週の始まりの設定を返す", async () => {
    const me = await createUser({ weekStart: "sun" });
    const view = await getReviewView(me, 2024, null, now);
    expect(view.weekStart).toBe("sun");
  });
});
