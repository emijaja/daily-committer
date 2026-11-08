"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { cx } from "./cx";
import { Icon } from "./icons";
import { Marker } from "./Marker";
import { Pill } from "./Pill";
import { ProgressBar } from "./ProgressBar";
import { formatQuantity, parseQuantity } from "./quantity";

export interface QuantityTotalSheetProps {
  open: boolean;
  onClose: () => void;
  /** 英字の見出し（例 Workout） */
  title: string;
  /** 習慣の名前（例 筋トレ） */
  habitName: string;
  /** 日付の表示（例 11月1日（金）） */
  dateLabel: string;
  unit: string;
  /** 量の目標。null なら目標なし（バーと「目標の N」を出さない） */
  target: number | null;
  /** シートを開いたときの合計（いまの記録） */
  initialValue: number;
  /** チップで足す量（既定 +1 / +5 / +10） */
  steps?: readonly number[];
  /** 「N 回で記録する」を押したとき。value は合計 */
  onSubmit: (value: number) => void;
}

/**
 * ⑧-a 量の記録：合計を入力。
 * −／＋・チップ・直接入力で合計を決めて記録する。開くたびに入力は initialValue に戻る。
 */
export function QuantityTotalSheet({
  open,
  onClose,
  title,
  habitName,
  dateLabel,
  unit,
  target,
  initialValue,
  steps = [1, 5, 10],
  onSubmit,
}: QuantityTotalSheetProps) {
  const [text, setText] = useState(() => formatQuantity(initialValue));
  // 開いたときに入力を initialValue に戻す（描画中に前回の open と比べる。Effect は使わない）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText(formatQuantity(initialValue));
  }
  const value = parseQuantity(text);
  const set = (n: number) => setText(formatQuantity(Math.max(0, n)));

  const subtitle = [
    habitName,
    dateLabel,
    target !== null ? `目標 ${formatQuantity(target)} ${unit}` : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  const remaining = target !== null ? target - value : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      <div className="frame flex items-center justify-between px-[15px] pt-7 pb-2.5">
        <button
          type="button"
          aria-label="1 減らす"
          disabled={value <= 0}
          onClick={() => set(value - 1)}
          className="frame flex size-12 shrink-0 items-center justify-center bg-white disabled:opacity-30"
        >
          <Icon name="minus" size={20} />
        </button>
        <label className="flex min-w-0 flex-col items-center">
          <span className="flex items-baseline gap-1">
            <input
              inputMode="decimal"
              aria-label={`${habitName}の合計（${unit}）`}
              value={text}
              // field-sizing に未対応のブラウザでも、文字数に合わせた幅にする
              size={Math.max(text.length, 1)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                if (/^\d*\.?\d{0,2}$/.test(v)) setText(v);
              }}
              onBlur={() => set(value)}
              className="font-latin field-sizing-content min-w-[1.2ch] bg-transparent text-center text-[54px] leading-[60px] font-black tracking-[-0.02em] outline-none focus:underline"
            />
            <span className="text-[14px] font-bold">{unit}</span>
          </span>
          <span className="mt-1.5 text-[9px] font-medium text-gray-500">
            タップで直接入力
          </span>
        </label>
        <button
          type="button"
          aria-label="1 増やす"
          onClick={() => set(value + 1)}
          className="flex size-12 shrink-0 items-center justify-center bg-black text-white"
        >
          <Icon name="plus" size={20} />
        </button>
      </div>

      {target !== null ? (
        <div className="mt-5">
          <ProgressBar
            value={target > 0 ? value / target : 1}
            size="sheet"
            label="目標までの進み具合"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <Marker>
              {remaining !== null && remaining > 0
                ? `あと ${formatQuantity(remaining)} ${unit}で目標`
                : remaining === 0
                  ? "目標達成！"
                  : `目標を ${formatQuantity(-(remaining ?? 0))} ${unit}超えました`}
            </Marker>
            <span className="font-latin font-bold text-gray-500">
              {formatQuantity(value)} / {formatQuantity(target)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((s) => (
          <Pill
            key={s}
            size="md"
            variant="secondary"
            className="px-4"
            onClick={() => set(value + s)}
          >
            +{formatQuantity(s)}
          </Pill>
        ))}
        {target !== null ? (
          <Pill size="md" className="px-4" onClick={() => set(target)}>
            目標の {formatQuantity(target)}
          </Pill>
        ) : null}
      </div>

      <div className="mt-24 flex items-center gap-4">
        <button
          type="button"
          onClick={() => set(0)}
          className={cx(
            "min-h-11 shrink-0 text-[12px] font-bold underline underline-offset-2",
          )}
        >
          0 に戻す
        </button>
        <Pill block={false} className="flex-1" onClick={() => onSubmit(value)}>
          {formatQuantity(value)} {unit}で記録する
        </Pill>
      </div>
    </BottomSheet>
  );
}
