import { describe, expect, it } from "vitest";
import type { PeriodProgress } from "./achievement";
import { addDays } from "./date";
import { d } from "./fixtures";
import {
  fillTemplate,
  GRUMBLE_LINES,
  grumbleScene,
  pickBySeed,
  selectGrumble,
  type GrumbleInput,
} from "./grumble";

const progress = (
  habitId: string,
  achieved: boolean,
  recorded = achieved,
): PeriodProgress => ({
  habitId,
  range: { start: d("2024-11-06"), end: d("2024-11-06") },
  measure: "days",
  current: recorded ? 1 : 0,
  target: 1,
  achieved,
  overBy: null,
  remaining: achieved ? null : 1,
  recordedDates: recorded ? ["2024-11-06"] : [],
});

const base: GrumbleInput = {
  period: "daily",
  progresses: [],
  hour: 12,
  today: d("2024-11-06"),
  habitNames: { a: "早起き", b: "読書", c: "筋トレ" },
};

describe("grumbleScene：優先順", () => {
  it("習慣が0件なら null", () => {
    expect(grumbleScene(base)).toBeNull();
    expect(selectGrumble(base)).toBeNull();
  });

  it("すべて達成なら夜でも allDone", () => {
    const progresses = [progress("a", true), progress("b", true)];
    expect(grumbleScene({ ...base, progresses, hour: 23 })).toBe("allDone");
  });

  it("今日タブで 22時以降・0〜3時に未達成が残っていれば night", () => {
    const progresses = [progress("a", false), progress("b", true)];
    expect(grumbleScene({ ...base, progresses, hour: 21 })).toBe("remaining");
    expect(grumbleScene({ ...base, progresses, hour: 22 })).toBe("night");
    expect(grumbleScene({ ...base, progresses, hour: 2 })).toBe("night");
    expect(grumbleScene({ ...base, progresses, hour: 4 })).toBe("remaining");
  });

  it("今週・今月タブでは夜でも night にしない", () => {
    const progresses = [progress("a", false), progress("b", true)];
    expect(
      grumbleScene({ ...base, period: "weekly", progresses, hour: 23 }),
    ).toBe("remaining");
  });

  it("まだ何も記録していなければ nothingYet", () => {
    const progresses = [progress("a", false), progress("b", false)];
    expect(grumbleScene({ ...base, progresses })).toBe("nothingYet");
  });

  it("記録はあるが未達成（週3回のうち1回など）は remaining", () => {
    const progresses = [progress("a", false, true)];
    expect(grumbleScene({ ...base, period: "weekly", progresses })).toBe(
      "remaining",
    );
  });
});

describe("selectGrumble", () => {
  it("場面ごとの表情", () => {
    const all = [progress("a", true)];
    const some = [progress("a", false), progress("b", true)];
    const none = [progress("a", false)];
    expect(selectGrumble({ ...base, progresses: all })?.expression).toBe(
      "happy",
    );
    expect(
      selectGrumble({ ...base, progresses: some, hour: 23 })?.expression,
    ).toBe("sleepy");
    expect(selectGrumble({ ...base, progresses: none })?.expression).toBe(
      "grumpy",
    );
    expect(selectGrumble({ ...base, progresses: some })?.expression).toBe(
      "grumpy",
    );
  });

  it("同じ日・同じ状況なら同じセリフ、日が変わると変わりうる", () => {
    const input = { ...base, progresses: [progress("a", false)] };
    const first = selectGrumble(input);
    expect(selectGrumble(input)).toEqual(first);
    const texts = new Set(
      Array.from(
        { length: 30 },
        (_, i) =>
          selectGrumble({ ...input, today: addDays(d("2024-11-01"), i) })?.text,
      ),
    );
    expect(texts.size).toBeGreaterThan(1);
  });

  it("差し込みの値が埋まり、{ } が残らない", () => {
    const progresses = [
      progress("b", true),
      progress("a", false, true),
      progress("c", false),
    ];
    for (let i = 0; i < 40; i++) {
      const today = addDays(d("2024-11-01"), i);
      for (const hour of [12, 23]) {
        for (const period of ["daily", "weekly", "monthly"] as const) {
          const text = selectGrumble({
            ...base,
            period,
            progresses,
            hour,
            today,
          })?.text;
          expect(text).toBeDefined();
          expect(text).not.toMatch(/[{}]/);
          expect(text).not.toContain("読書"); // 達成済みの習慣は差し込まない
        }
      }
    }
  });

  it("未達成の最初の習慣の名前と数を差し込む", () => {
    // remaining の候補をすべて試し、{habit}・{left} の行で値を確かめる
    const progresses = [
      progress("b", true),
      progress("a", false, true),
      progress("c", false),
    ];
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const text = selectGrumble({
        ...base,
        progresses,
        today: addDays(d("2024-01-01"), i),
      })?.text;
      if (text) seen.add(text);
    }
    expect(seen).toContain("早起き、まだかぁ…。でも記録してるの、えらい。");
    expect(seen).toContain("あと2つ…。ぼくなら、もうあきらめてるよ。");
    expect(seen).toContain("1 / 3。ぼくから見たら、もう十分すごい。");
  });

  it("習慣名が引けなければ「習慣」", () => {
    const progresses = [progress("zzz", false)];
    const texts = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const text = selectGrumble({
        ...base,
        progresses,
        today: addDays(d("2024-01-01"), i),
      })?.text;
      if (text) texts.add(text);
    }
    expect(texts).toContain("習慣、ちょっとだけやってみる？ ぼくは見てる。");
  });
});

describe("pickBySeed / fillTemplate / GRUMBLE_LINES", () => {
  it("pickBySeed は決定的で、空なら例外", () => {
    const items = ["a", "b", "c"];
    expect(pickBySeed(items, "seed")).toBe(pickBySeed(items, "seed"));
    expect(items).toContain(pickBySeed(items, "x"));
    expect(() => pickBySeed([], "seed")).toThrow();
  });

  it("fillTemplate は知らない key をそのまま残す", () => {
    expect(fillTemplate("{a}と{b}と{c}", { a: 1, b: "二" })).toBe("1と二と{c}");
  });

  it("どの場面にもセリフがある", () => {
    for (const lines of Object.values(GRUMBLE_LINES)) {
      expect(lines.length).toBeGreaterThan(0);
    }
  });
});
