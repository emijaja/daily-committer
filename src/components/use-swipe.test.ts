import { describe, expect, it } from "vitest";
import { swipeStep } from "./use-swipe";

describe("swipeStep", () => {
  it("左へ払うと次へ、右へ払うと前へ", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, -5)).toBe(-1);
  });

  it("短い移動はスワイプにしない", () => {
    expect(swipeStep(-49, 0)).toBe(0);
    expect(swipeStep(30, 0)).toBe(0);
  });

  it("縦や斜めの動き（縦スクロール）はスワイプにしない", () => {
    expect(swipeStep(-80, 200)).toBe(0);
    expect(swipeStep(80, 41)).toBe(0);
    expect(swipeStep(80, 40)).toBe(-1);
  });
});
