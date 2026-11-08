import { describe, expect, it } from "vitest";
import { datesInRange } from "@/domain/date";
import {
  checkHabit,
  createHabit,
  createUser,
  d,
  incrementHabit,
} from "@/server/testing/factories";
import { archiveHabit } from "./habits";
import { addQuantity, toggleCheck } from "./record";
import { getHabitDetail } from "./review";
import { updateSettings } from "./settings";

// getHabitDetail（③ 習慣の詳細）の統合テスト。review.ts の他の関数のテストは review.int.test.ts

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

describe("getHabitDetail", () => {
  it("連続・最長連続・自己ベスト・直近1年の2値の草・数字の箱を返す", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit({ name: "読書" }), {
      createdOn: "2023-06-01",
    });
    // 2023-07-01〜07-10 の10日（前の年をまたいだ最長より短い）
    await checkEveryDay(me, reading, "2023-07-01", "2023-07-10");
    // 2024-10-09〜11-06 の29日連続（今日を含む）
    await checkEveryDay(me, reading, "2024-10-09", "2024-11-06");

    const view = await getHabitDetail(me, reading, now);
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.habit.id).toBe(reading);
    expect(view.today).toBe("2024-11-06");
    expect(view.weekStart).toBe("mon");
    expect(view.streakUnit).toBe("日");
    expect(view.currentStreak).toBe(29);
    expect(view.longestStreak).toBe(29);
    expect(view.isPersonalBest).toBe(true);

    // 直近1年：2023-11-08〜2024-11-06 の365日
    expect(view.grass).toHaveLength(365);
    expect(view.grass[0]?.date).toBe("2023-11-08");
    expect(view.grass.at(-1)?.date).toBe("2024-11-06");
    expect(levelOn(view.grass, "2024-11-06")).toBe(3);
    expect(levelOn(view.grass, "2024-10-08")).toBe(0);

    expect(view.stats).toEqual([
      { label: "最長連続", value: "29", unit: "日" },
      { label: "今月", value: "6", unit: "/ 30日" },
      { label: "今年の合計", value: "29", unit: "日" },
      { label: "始めた日", value: "6.1", unit: "2023年" },
    ]);
    expect(view.grumble?.expression).toBe("happy");
  });

  it("最長連続が過去にあれば、自己ベストではない", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit(), {
      createdOn: "2024-01-01",
    });
    await checkEveryDay(me, reading, "2024-03-01", "2024-03-20");
    await checkEveryDay(me, reading, "2024-11-04", "2024-11-06");

    const view = await getHabitDetail(me, reading, now);
    expect(view?.currentStreak).toBe(3);
    expect(view?.longestStreak).toBe(20);
    expect(view?.isPersonalBest).toBe(false);
  });

  it("週次の量の習慣：連続は週で数え、今週の進み具合と今年の量の合計を出す", async () => {
    const me = await createUser();
    const running = await createHabit(me, incrementHabit(), {
      createdOn: "2024-10-01",
    });
    // 10/21〜の週・10/28〜の週は 10km 以上、今週（11/4〜）は 2.5 + 3 = 5.5 km
    await addQuantity(me, running, d("2024-10-22"), 10);
    await addQuantity(me, running, d("2024-10-29"), 6.2);
    await addQuantity(me, running, d("2024-11-01"), 4);
    await addQuantity(me, running, d("2024-11-04"), 2.5);
    await addQuantity(me, running, d("2024-11-05"), 3);

    const view = await getHabitDetail(me, running, now);
    expect(view?.streakUnit).toBe("週");
    expect(view?.currentStreak).toBe(2);
    expect(view?.stats[1]).toEqual({
      label: "今週",
      value: "5.5",
      unit: "/ 10km",
    });
    expect(view?.stats[2]).toEqual({
      label: "今年の合計",
      value: "25.7",
      unit: "km",
    });
  });

  it("過去の習慣も表示でき、草は過去にした日の前の日まで", async () => {
    const me = await createUser();
    const diary = await createHabit(me, checkHabit({ name: "日記" }), {
      createdOn: "2024-10-01",
    });
    await checkEveryDay(me, diary, "2024-10-25", "2024-10-31");
    // 11/1 に過去の習慣にする
    await archiveHabit(me, diary, new Date("2024-11-01T03:00:00Z"));

    const view = await getHabitDetail(me, diary, now);
    expect(view?.habit.archivedOn).toBe("2024-11-01");
    expect(view?.currentStreak).toBe(0);
    expect(view?.longestStreak).toBe(7);
    expect(view?.grass.at(-1)?.date).toBe("2024-10-31");
    expect(levelOn(view?.grass ?? [], "2024-10-31")).toBe(3);
    expect(view?.grumble?.expression).toBe("sleepy");
  });

  it("他人の習慣・存在しない習慣は null", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);
    expect(await getHabitDetail(me, theirs, now)).toBeNull();
    expect(
      await getHabitDetail(me, "00000000-0000-4000-8000-000000000000", now),
    ).toBeNull();
  });

  it("ほかの習慣・他人の記録は数えない", async () => {
    const me = await createUser();
    const other = await createUser();
    const reading = await createHabit(me, checkHabit(), { sortOrder: 0 });
    const early = await createHabit(me, checkHabit({ name: "早起き" }), {
      sortOrder: 1,
    });
    const theirs = await createHabit(other);
    await checkEveryDay(me, early, "2024-11-01", "2024-11-06");
    await toggleCheck(other, theirs, d("2024-11-06"));

    const view = await getHabitDetail(me, reading, now);
    expect(view?.currentStreak).toBe(0);
    expect(view?.grass.every((c) => c.level === 0)).toBe(true);
    expect(view?.grumble?.expression).toBe("sleepy");
  });

  it("ぼやきを表示しない設定なら grumble は null", async () => {
    const me = await createUser();
    const reading = await createHabit(me);
    await updateSettings(me, { grumbleEnabled: false });
    const view = await getHabitDetail(me, reading, now);
    expect(view?.grumble).toBeNull();
  });
});
