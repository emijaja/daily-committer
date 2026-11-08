import { describe, expect, it } from "vitest";
import { d } from "./fixtures";
import type { ReviewItem } from "./review";
import {
  REVIEW_GRUMBLE_LINES,
  reviewGrumbleScene,
  selectReviewGrumble,
} from "./review-grumble";

const item = (habitId: string, value: number, unit: string): ReviewItem => ({
  habitId,
  kind: "dailyStreak",
  score: value,
  segments: [{ text: "x" }],
  figure: { value, unit },
});

const base = {
  achievements: [] as ReviewItem[],
  almostThere: [] as ReviewItem[],
  recordCount: 0,
  today: d("2024-11-06"),
  habitNames: { a: "読書", b: "早起き" },
};

describe("reviewGrumbleScene", () => {
  it("達成していること → もう少しで達成 → 記録あり → 記録なし の順に判定する", () => {
    expect(
      reviewGrumbleScene({
        ...base,
        achievements: [item("a", 27, "日")],
        almostThere: [item("b", 1, "日")],
        recordCount: 5,
      }),
    ).toBe("achieving");
    expect(
      reviewGrumbleScene({
        ...base,
        almostThere: [item("b", 1, "日")],
        recordCount: 5,
      }),
    ).toBe("almost");
    expect(reviewGrumbleScene({ ...base, recordCount: 5 })).toBe("recorded");
    expect(reviewGrumbleScene(base)).toBe("empty");
  });
});

describe("selectReviewGrumble", () => {
  it("達成していることがあれば happy で、いちばん上の項目の値を差し込む", () => {
    const g = selectReviewGrumble({
      ...base,
      achievements: [item("a", 27, "日"), item("b", 3, "日")],
      recordCount: 30,
    });
    expect(g.expression).toBe("happy");
    expect(
      REVIEW_GRUMBLE_LINES.achieving.map((t) =>
        t
          .replaceAll("{value}", "27")
          .replaceAll("{unit}", "日")
          .replaceAll("{habit}", "読書"),
      ),
    ).toContain(g.text);
  });

  it("記録がなければ sleepy", () => {
    const g = selectReviewGrumble(base);
    expect(g.expression).toBe("sleepy");
    expect(REVIEW_GRUMBLE_LINES.empty).toContain(g.text);
  });

  it("もう少しで達成・記録ありは normal で、値を差し込む", () => {
    const almost = selectReviewGrumble({
      ...base,
      almostThere: [item("b", 2, "日")],
    });
    expect(almost.expression).toBe("normal");
    expect(
      REVIEW_GRUMBLE_LINES.almost.map((t) =>
        t
          .replaceAll("{value}", "2")
          .replaceAll("{unit}", "日")
          .replaceAll("{habit}", "早起き"),
      ),
    ).toContain(almost.text);

    const recorded = selectReviewGrumble({ ...base, recordCount: 12 });
    expect(recorded.expression).toBe("normal");
    expect(
      REVIEW_GRUMBLE_LINES.recorded.map((t) => t.replace("{count}", "12")),
    ).toContain(recorded.text);
  });

  it("同じ日なら同じセリフ", () => {
    const input = { ...base, recordCount: 3 };
    expect(selectReviewGrumble(input)).toEqual(selectReviewGrumble(input));
  });
});
