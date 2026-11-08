import { describe, expect, it } from "vitest";
import {
  HABIT_PRESETS,
  orderPresetSelection,
  presetCountLabel,
} from "./presets";

describe("おすすめの習慣", () => {
  it("名前は重複せず、習慣の名前の上限（50文字）に収まる", () => {
    expect(new Set(HABIT_PRESETS).size).toBe(HABIT_PRESETS.length);
    for (const name of HABIT_PRESETS) expect(name.length).toBeLessThan(50);
  });

  it("選んだ数の表示", () => {
    expect(presetCountLabel(0)).toBe("0");
    expect(presetCountLabel(3)).toBe("3つ");
  });

  it("選んだ名前をおすすめの並び順にし、おすすめにないものは捨てる", () => {
    expect(orderPresetSelection(["筋トレ", "読書", "ほか"])).toEqual([
      "読書",
      "筋トレ",
    ]);
  });
});
