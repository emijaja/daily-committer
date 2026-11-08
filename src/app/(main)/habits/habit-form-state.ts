/**
 * ⑤ のフォームの状態と、保存する値（HabitInput）への変換・検証。
 * フォームは記録方式・周期を切り替えても入力を覚えておき、保存のときに
 * 今の記録方式・周期で使う値だけを HabitInput に入れる（使わない値は null）。
 */
import type { Habit, InputMode, Period, RecordType } from "@/domain/types";
import type { HabitInput } from "@/server/services/types";
import { habitInputSchema } from "@/server/validation";

export interface HabitFormState {
  name: string;
  note: string;
  period: Period;
  recordType: RecordType;
  /** 週次・月次のチェックのみの回数 */
  timesPerPeriod: number;
  unit: string;
  /** null なら目標なし（量だけ記録） */
  quantityTarget: number | null;
  inputMode: InputMode;
}

export type HabitFormField = keyof HabitFormState;
export type HabitFormErrors = Partial<Record<HabitFormField, string>>;

export const TIMES_MAX: Record<Exclude<Period, "daily">, number> = {
  weekly: 7,
  monthly: 31,
};

const DEFAULT_TIMES: Record<Exclude<Period, "daily">, number> = {
  weekly: 3,
  monthly: 4,
};

export function initialFormState(habit?: Habit): HabitFormState {
  if (!habit) {
    return {
      name: "",
      note: "",
      period: "daily",
      recordType: "check",
      timesPerPeriod: DEFAULT_TIMES.weekly,
      unit: "",
      quantityTarget: 10,
      inputMode: "total",
    };
  }
  return {
    name: habit.name,
    note: habit.note ?? "",
    period: habit.period,
    recordType: habit.recordType,
    timesPerPeriod:
      habit.timesPerPeriod ??
      (habit.period === "daily"
        ? DEFAULT_TIMES.weekly
        : DEFAULT_TIMES[habit.period]),
    unit: habit.unit ?? "",
    quantityTarget: habit.recordType === "quantity" ? habit.quantityTarget : 10,
    inputMode: habit.inputMode ?? "total",
  };
}

/** 周期を変えたとき、回数がその周期の上限を超えていたら上限に合わせる */
export function changePeriod(
  state: HabitFormState,
  period: Period,
): HabitFormState {
  const timesPerPeriod =
    period === "daily"
      ? state.timesPerPeriod
      : Math.min(state.timesPerPeriod, TIMES_MAX[period]);
  return { ...state, period, timesPerPeriod };
}

/** 今の記録方式・周期で使う値だけを入れる */
export function toHabitInput(state: HabitFormState): HabitInput {
  const isCheck = state.recordType === "check";
  return {
    name: state.name,
    note: state.note,
    period: state.period,
    recordType: state.recordType,
    timesPerPeriod:
      isCheck && state.period !== "daily" ? state.timesPerPeriod : null,
    unit: isCheck ? null : state.unit,
    quantityTarget: isCheck ? null : state.quantityTarget,
    inputMode: isCheck ? null : state.inputMode,
  };
}

/** zod の既定のメッセージ（英語）の代わりに出す文 */
const FALLBACK_MESSAGE: Partial<Record<HabitFormField, string>> = {
  name: "名前を1〜50文字で入力してください",
  note: "補足は200文字までです",
  unit: "単位は10文字までです",
  quantityTarget: "目標は 0 より大きい数にしてください",
  timesPerPeriod: "回数の目標を入力してください",
};

/**
 * server/validation の habitInputSchema で検証する（サーバーでも同じスキーマで検証する）。
 * 項目ごとに最初のエラーを返す。
 */
export function validateHabitForm(
  state: HabitFormState,
): { ok: true; input: HabitInput } | { ok: false; errors: HabitFormErrors } {
  const input = toHabitInput(state);
  const parsed = habitInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, input: parsed.data };
  const errors: HabitFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as HabitFormField | undefined;
    if (!field || errors[field]) continue;
    errors[field] =
      issue.code === "custom"
        ? issue.message
        : (FALLBACK_MESSAGE[field] ?? "入力の値が正しくありません");
  }
  return { ok: false, errors };
}
