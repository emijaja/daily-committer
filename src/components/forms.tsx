"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import type { InputMode, Period, RecordType } from "@/domain/types";
import { cx } from "./cx";
import { Icon } from "./icons";

/* ---------------------------------------------------------------- 項目 */

export interface FieldProps {
  label: ReactNode;
  /** 項目の下の小さな注記 */
  note?: ReactNode;
  /** label を結びつける入力の id（TextField は自動） */
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** フォームの1項目：見出し（11px 太字）＋中身＋注記 */
export function Field({
  label,
  note,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-[11px] font-bold">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {note ? (
        <p className="mt-1.5 text-[9px] leading-[14px] font-medium text-gray-500">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label: ReactNode;
  note?: ReactNode;
}

/** 入力欄：黒枠 1.5px の四角、高さ 46。フォーカス中は 2.5px */
export function TextField({
  label,
  note,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} note={note} htmlFor={inputId} className={className}>
      <input
        id={inputId}
        className="frame h-(--size-input-height) w-full bg-white px-4 text-[15px] font-medium outline-none placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:ring-inset"
        {...rest}
      />
    </Field>
  );
}

/* ---------------------------------------------------------------- 切り替え */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 読み上げ用のラベル */
  label: string;
  className?: string;
}

/** 切り替え（セグメント）：黒枠の横並び。選択中は黒塗り＋白のチェック */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("frame flex divide-x-[1.5px] divide-black", className)}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-bold",
              selected ? "bg-black text-white" : "bg-white text-black",
            )}
          >
            {selected ? (
              <Icon name="check" size={12} strokeWidth={2.4} />
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const PERIOD_OPTIONS: readonly SegmentedOption<Period>[] = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
];

const PERIOD_NOTE: Record<Period, string> = {
  daily: "「記録 › 今日」に表示されます",
  weekly: "「記録 › 今週」に表示されます",
  monthly: "「記録 › 今月」に表示されます",
};

/** 周期の選択（毎日／毎週／毎月）＋表示される場所の注記 */
export function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value: Period;
  onChange: (value: Period) => void;
  className?: string;
}) {
  return (
    <Field label="周期" note={PERIOD_NOTE[value]} className={className}>
      <SegmentedControl
        label="周期"
        options={PERIOD_OPTIONS}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

const RECORD_TYPE_OPTIONS: readonly SegmentedOption<RecordType>[] = [
  { value: "check", label: "チェックのみ" },
  { value: "quantity", label: "量も記録" },
];

/** 記録方式の選択（チェックのみ／量も記録） */
export function RecordTypeSelect({
  value,
  onChange,
  className,
}: {
  value: RecordType;
  onChange: (value: RecordType) => void;
  className?: string;
}) {
  return (
    <Field
      label="記録方式"
      note={
        value === "check"
          ? "量（ページ数・km など）も記録したいときは「量も記録」"
          : undefined
      }
      className={className}
    >
      <SegmentedControl
        label="記録方式"
        options={RECORD_TYPE_OPTIONS}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

const INPUT_MODE_OPTIONS: readonly SegmentedOption<InputMode>[] = [
  { value: "total", label: "合計を入力" },
  { value: "increment", label: "回ごとに足す" },
];

const PERIOD_WORD: Record<Period, string> = {
  daily: "日",
  weekly: "週",
  monthly: "月",
};

/** 量の入力のしかた（合計を入力／回ごとに足す） */
export function InputModeSelect({
  value,
  onChange,
  period,
  className,
}: {
  value: InputMode;
  onChange: (value: InputMode) => void;
  period: Period;
  className?: string;
}) {
  const word = PERIOD_WORD[period];
  return (
    <Field
      label="入力のしかた"
      note={
        value === "increment"
          ? `1回ごとに量を足し、${word}の合計で目標と比べます`
          : `その${word}の合計を入力します`
      }
      className={className}
    >
      <SegmentedControl
        label="入力のしかた"
        options={INPUT_MODE_OPTIONS}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

/* ---------------------------------------------------------------- 数値の± */

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 数字の右の単位（例 回、km） */
  unit?: string;
  /** 読み上げ用のラベル（例：1週間の回数） */
  label: string;
  className?: string;
}

/** 数値の±：−（白・黒枠）・数字・＋（黒塗り）・単位 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  label,
  className,
}: NumberStepperProps) {
  const clamp = (n: number) =>
    Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("flex items-center gap-2", className)}
    >
      <button
        type="button"
        aria-label={`${step} 減らす`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="frame flex size-9 items-center justify-center bg-white disabled:opacity-30"
      >
        <Icon name="minus" size={16} />
      </button>
      <output
        aria-live="polite"
        className="font-latin min-w-12 text-center text-[22px] font-extrabold"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`${step} 増やす`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="flex size-9 items-center justify-center bg-black text-white disabled:opacity-30"
      >
        <Icon name="plus" size={16} />
      </button>
      {unit ? (
        <span className="ml-1 min-w-5 text-[12px] font-bold">{unit}</span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- 目標ブロック */

export interface GoalBlockProps {
  period: Period;
  recordType: RecordType;
  /** 週次・月次のチェックのみの回数 */
  timesPerPeriod: number;
  onTimesPerPeriodChange: (value: number) => void;
  /** 量の単位 */
  unit: string;
  onUnitChange: (value: string) => void;
  /** 量の目標。null なら目標なし（量だけ記録） */
  quantityTarget: number | null;
  onQuantityTargetChange: (value: number | null) => void;
  inputMode: InputMode;
  onInputModeChange: (value: InputMode) => void;
  className?: string;
}

const TIMES_LABEL: Record<Exclude<Period, "daily">, string> = {
  weekly: "1週間に",
  monthly: "1か月に",
};

const TARGET_LABEL: Record<Period, string> = {
  daily: "1日の目標",
  weekly: "1週間の目標",
  monthly: "1か月の目標",
};

/**
 * 目標ブロック（⑤-a/⑤-b）。記録方式と周期で中身が切り替わる。
 * - チェックのみ・毎日：入力なし（毎日 1回 記録できたら達成）
 * - チェックのみ・毎週／毎月：回数の ±
 * - 量も記録：単位・量の目標の ±（目標なしも選べる）・入力のしかた
 */
export function GoalBlock({
  period,
  recordType,
  timesPerPeriod,
  onTimesPerPeriodChange,
  unit,
  onUnitChange,
  quantityTarget,
  onQuantityTargetChange,
  inputMode,
  onInputModeChange,
  className,
}: GoalBlockProps) {
  if (recordType === "check") {
    if (period === "daily") {
      return (
        <section className={className}>
          <h3 className="text-[11px] font-bold">目標</h3>
          <p className="mt-2 text-[15px] font-bold">
            毎日 1回 記録できたら達成
          </p>
          <p className="mt-1.5 text-[9px] leading-[14px] font-medium text-gray-500">
            周期を「毎週」「毎月」にすると回数を、
            <br />
            「量も記録」にすると量の目標を決められます
          </p>
        </section>
      );
    }
    const timesLabel = TIMES_LABEL[period];
    return (
      <section className={className}>
        <h3 className="text-[11px] font-bold">目標</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[13px] font-bold">{timesLabel}</span>
          <NumberStepper
            label={`${timesLabel}記録する回数`}
            value={timesPerPeriod}
            onChange={onTimesPerPeriodChange}
            min={1}
            max={period === "weekly" ? 7 : 31}
            unit="回"
          />
        </div>
        <p className="mt-1.5 text-[9px] leading-[14px] font-medium text-gray-500">
          {timesLabel}
          {timesPerPeriod}日記録できたら達成。
          {period === "weekly" ? "毎月なら「1か月に」" : "毎週なら「1週間に」"}
        </p>
      </section>
    );
  }

  return (
    <section className={cx("space-y-4", className)}>
      <div>
        <h3 className="text-[11px] font-bold">目標</h3>
        <TextField
          label={<span className="font-medium text-gray-500">単位</span>}
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          placeholder="例：km、ページ、回"
          className="mt-2"
        />
      </div>
      {quantityTarget !== null ? (
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">
              {TARGET_LABEL[period]}
            </span>
            <NumberStepper
              label={TARGET_LABEL[period]}
              value={quantityTarget}
              onChange={onQuantityTargetChange}
              min={0}
              unit={unit}
            />
          </div>
          <button
            type="button"
            onClick={() => onQuantityTargetChange(null)}
            className="min-h-11 text-[12px] font-bold underline underline-offset-2"
          >
            目標なしにする（量だけ記録）
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold">目標なし（量だけ記録）</span>
          <button
            type="button"
            onClick={() => onQuantityTargetChange(1)}
            className="min-h-11 text-[12px] font-bold underline underline-offset-2"
          >
            目標を決める
          </button>
        </div>
      )}
      <InputModeSelect
        value={inputMode}
        onChange={onInputModeChange}
        period={period}
      />
    </section>
  );
}

/* ---------------------------------------------------------------- トグル */

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 読み上げ用のラベル */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** トグル：44×26 のピル。ON＝黒地に黄色のつまみ、OFF＝白地に白のつまみ（黒枠） */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "rounded-pill relative inline-flex h-(--size-toggle-h) w-(--size-toggle-w) shrink-0 items-center border-(length:--stroke-box) border-black transition-colors disabled:opacity-40",
        "after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']",
        checked ? "bg-black" : "bg-white",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full transition-[left]",
          checked
            ? "bg-yellow left-[calc(100%-21px)]"
            : "frame left-[1.5px] bg-white",
        )}
      />
    </button>
  );
}
