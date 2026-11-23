import { describe, expect, it } from "vitest";
import { d } from "./fixtures";
import {
  countByDate,
  memoSpeech,
  monthsBefore,
  normalizeMemoBody,
  pastMemoCandidates,
  promptOf,
  targetStats,
  type MemoCategory,
} from "./memo";
import type { LogicalDate } from "./types";

const good: MemoCategory = {
  id: "c-good",
  name: "よかったこと",
  prompt: "今日よかったこと、3つ教えて。",
  dailyTarget: 3,
  sortOrder: 0,
};
const grumble: MemoCategory = {
  id: "c-grumble",
  name: "ぼやき",
  prompt: null,
  dailyTarget: null,
  sortOrder: 1,
};

/** date に n 件の「よかったこと」 */
function many(date: string, n: number, categoryId = good.id) {
  return Array.from({ length: n }, () => ({
    date: d(date),
    categoryId,
  }));
}

describe("promptOf / normalizeMemoBody", () => {
  it("お題がなければ既定の文", () => {
    expect(promptOf(good)).toBe("今日よかったこと、3つ教えて。");
    expect(promptOf(grumble)).toBe("今日のぼやき、聞かせて。");
  });

  it("前後の空白を除き、空なら null", () => {
    expect(normalizeMemoBody("  雨だった \n")).toBe("雨だった");
    expect(normalizeMemoBody(" \n")).toBeNull();
  });
});

describe("countByDate", () => {
  it("日ごとに数え、カテゴリを渡すとそのカテゴリだけ", () => {
    const memos = [
      ...many("2026-11-20", 2),
      ...many("2026-11-20", 1, grumble.id),
    ];
    expect(countByDate(memos).get(d("2026-11-20"))).toBe(3);
    expect(countByDate(memos, good.id).get(d("2026-11-20"))).toBe(2);
  });
});

describe("targetStats", () => {
  const today = d("2026-11-21");

  it("目標がないカテゴリは null", () => {
    expect(targetStats(grumble, [], today)).toBeNull();
  });

  it("今日がまだなら、連続は昨日まで数え、今月の日数も昨日まで", () => {
    const memos = [
      ...many("2026-11-18", 3),
      ...many("2026-11-19", 3),
      ...many("2026-11-20", 4),
      ...many("2026-11-21", 2),
      ...many("2026-11-20", 5, grumble.id),
    ];
    const stats = targetStats(good, memos, today);
    expect(stats).toMatchObject({
      todayCount: 2,
      remaining: 1,
      current: 3,
      longest: 3,
      month: { achieved: 3, days: 20 },
    });
    expect(stats?.week.map((w) => w.achieved)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
    expect(stats?.week.at(-1)).toMatchObject({ date: today, count: 2 });
  });

  it("今日も達成していれば連続と今月に今日を含める。最長は途切れた前の連続も見る", () => {
    const memos = [
      ...many("2026-10-30", 3),
      ...many("2026-10-31", 3),
      ...many("2026-11-01", 3),
      ...many("2026-11-02", 3),
      ...many("2026-11-21", 3),
    ];
    const stats = targetStats(good, memos, today);
    expect(stats).toMatchObject({
      remaining: 0,
      current: 1,
      longest: 4,
      month: { achieved: 3, days: 21 },
    });
  });

  it("月の1日で今日がまだなら、今月は 0 / 0", () => {
    const stats = targetStats(good, [], d("2026-12-01"));
    expect(stats?.month).toEqual({ achieved: 0, days: 0 });
  });
});

describe("monthsBefore", () => {
  it("同じ日がなければ月末にする", () => {
    expect(monthsBefore(d("2026-03-31"), 1)).toBe("2026-02-28");
    expect(monthsBefore(d("2024-02-29"), 12)).toBe("2023-02-28");
    expect(monthsBefore(d("2026-01-15"), 1)).toBe("2025-12-15");
  });
});

describe("pastMemoCandidates", () => {
  const today = d("2026-11-21");
  const memo = (id: string, date: string, habitId: string | null = null) => ({
    id,
    date: d(date) as LogicalDate,
    habitId,
  });

  it("1年前の今日 → 1か月前の今日 → それ以外の順。今日と習慣へのひとことは出さない", () => {
    const memos = [
      memo("other-1", "2026-05-01"),
      memo("month", "2026-10-21"),
      memo("today", "2026-11-21"),
      memo("habit", "2025-11-21", "h1"),
      memo("year", "2025-11-21"),
      memo("other-2", "2026-02-10"),
    ];
    const picked = pastMemoCandidates(memos, today);
    expect(picked.slice(0, 2).map((p) => [p.memo.id, p.reason])).toEqual([
      ["year", "yearAgo"],
      ["month", "monthAgo"],
    ]);
    expect(picked.slice(2).map((p) => p.reason)).toEqual(["random", "random"]);
    expect(picked.map((p) => p.memo.id).sort()).toEqual(
      ["month", "other-1", "other-2", "year"].sort(),
    );
  });

  it("同じ日なら同じ順。件数は limit まで", () => {
    const memos = Array.from({ length: 30 }, (_, i) =>
      memo(`m${i}`, `2026-0${(i % 9) + 1}-1${i % 10}`),
    );
    const a = pastMemoCandidates(memos, today, 5);
    const b = pastMemoCandidates([...memos].reverse(), today, 5);
    expect(a).toHaveLength(5);
    expect(a.map((p) => p.memo.id)).toEqual(b.map((p) => p.memo.id));
  });
});

describe("memoSpeech", () => {
  const categories = [good, grumble];

  it("目標がまだのカテゴリがあれば、そのお題を次の番号つきで（happy）", () => {
    const speech = memoSpeech({
      categories,
      todayCounts: new Map([[good.id, 2]]),
      todayTotal: 2,
      hour: 21,
    });
    expect(speech).toEqual({
      expression: "happy",
      text: "今日よかったこと、3つ教えて。（3つめ）",
      meta: "よかったこと あと1つ",
      categoryId: good.id,
    });
  });

  it("目標を達成して今日書いていれば、聞いていたと返す（normal）", () => {
    const speech = memoSpeech({
      categories,
      todayCounts: new Map([[good.id, 3]]),
      todayTotal: 4,
      hour: 21,
    });
    expect(speech.expression).toBe("normal");
    expect(speech.meta).toBe("今日のメモ 4件");
  });

  it("目標がなく、22時以降でまだ書いていなければ sleepy。昼なら最初のお題", () => {
    expect(
      memoSpeech({
        categories: [grumble],
        todayCounts: new Map(),
        todayTotal: 0,
        hour: 22,
      }).expression,
    ).toBe("sleepy");
    expect(
      memoSpeech({
        categories: [grumble],
        todayCounts: new Map(),
        todayTotal: 0,
        hour: 12,
      }),
    ).toMatchObject({ expression: "happy", text: "今日のぼやき、聞かせて。" });
  });
});
