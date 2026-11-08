import { describe, expect, it } from "vitest";
import { makeHabit } from "@/domain/fixtures";
import {
  changePeriod,
  initialFormState,
  toHabitInput,
  validateHabitForm,
} from "./habit-form-state";

describe("toHabitInput", () => {
  it("毎日・チェックのみは回数も量も持たない", () => {
    const state = { ...initialFormState(), name: "読書" };
    expect(toHabitInput(state)).toEqual({
      name: "読書",
      note: "",
      period: "daily",
      recordType: "check",
      timesPerPeriod: null,
      unit: null,
      quantityTarget: null,
      inputMode: null,
    });
  });

  it("毎週・チェックのみは回数を持つ", () => {
    const state = changePeriod(
      { ...initialFormState(), name: "ストレッチ" },
      "weekly",
    );
    expect(toHabitInput(state)).toMatchObject({
      timesPerPeriod: 3,
      unit: null,
      quantityTarget: null,
      inputMode: null,
    });
  });

  it("量の習慣は回数を持たず、単位・目標・入力のしかたを持つ", () => {
    const state = {
      ...changePeriod(initialFormState(), "weekly"),
      name: "ランニング",
      recordType: "quantity" as const,
      unit: "km",
      inputMode: "increment" as const,
    };
    expect(toHabitInput(state)).toMatchObject({
      timesPerPeriod: null,
      unit: "km",
      quantityTarget: 10,
      inputMode: "increment",
    });
  });
});

describe("changePeriod", () => {
  it("回数が周期の上限を超えたら上限に合わせる", () => {
    const monthly = {
      ...changePeriod(initialFormState(), "monthly"),
      timesPerPeriod: 20,
    };
    expect(changePeriod(monthly, "weekly").timesPerPeriod).toBe(7);
    expect(changePeriod(monthly, "daily").timesPerPeriod).toBe(20);
  });
});

describe("validateHabitForm", () => {
  it("正しければ zod で整えた値を返す（補足の空は null）", () => {
    const result = validateHabitForm({
      ...initialFormState(),
      name: "  読書 ",
    });
    expect(result).toEqual({
      ok: true,
      input: expect.objectContaining({ name: "読書", note: null }),
    });
  });

  it("名前が空なら日本語のエラー", () => {
    const result = validateHabitForm(initialFormState());
    expect(result).toEqual({
      ok: false,
      errors: { name: "名前を1〜50文字で入力してください" },
    });
  });

  it("量の習慣で単位が空ならエラー、目標が 0 ならエラー", () => {
    const result = validateHabitForm({
      ...initialFormState(),
      name: "筋トレ",
      recordType: "quantity",
      unit: " ",
      quantityTarget: 0,
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        unit: "単位を入力してください",
        quantityTarget: "目標は 0 より大きい数にしてください",
      },
    });
  });

  it("目標なし（null）の量の習慣は通る", () => {
    const result = validateHabitForm({
      ...initialFormState(),
      name: "読書",
      recordType: "quantity",
      unit: "ページ",
      quantityTarget: null,
    });
    expect(result.ok).toBe(true);
  });
});

describe("initialFormState", () => {
  it("既存の習慣の値を入れる", () => {
    const habit = makeHabit({
      name: "ストレッチ",
      period: "weekly",
      recordType: "check",
      timesPerPeriod: 3,
    });
    expect(initialFormState(habit)).toMatchObject({
      name: "ストレッチ",
      period: "weekly",
      timesPerPeriod: 3,
      note: "",
    });
  });
});
