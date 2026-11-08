"use client";

import { useState, type ReactNode } from "react";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./icons";
import { NumPad } from "./NumPad";
import { Pill } from "./Pill";
import { ProgressBar } from "./ProgressBar";
import { formatQuantity, parseQuantity } from "./quantity";

export interface QuantityLogItem {
  id: string;
  /** 例：月 10/28 */
  dateLabel: string;
  quantity: number;
}

export interface QuantityIncrementSheetProps {
  open: boolean;
  onClose: () => void;
  /** 英字の見出し（例 Running） */
  title: string;
  /** 習慣の名前（例 ランニング） */
  habitName: string;
  /** 期間の表示（例 10/28〜11/3） */
  periodLabel: string;
  /** 合計の見出し（例 今週の合計） */
  totalLabel: string;
  unit: string;
  /** 量の目標。null なら目標なし */
  target: number | null;
  /** その期間の合計（いまの記録） */
  total: number;
  /** その期間の記録の一覧（日付の古い順） */
  items: readonly QuantityLogItem[];
  /** 一覧の行を押したとき（その日の記録を直す） */
  onItemPress?: (id: string) => void;
  /** 指定すると一覧の各行の右に「削除」を出す */
  onItemDelete?: (id: string) => void;
  /** 入力欄の見出し（例：今日（金 11/1）の分を追加） */
  addLabel: ReactNode;
  /** 小数点以下の桁数（0 なら整数だけ）。既定 2 */
  decimals?: number;
  /** 「N を追加」を押したとき。amount はこの回の量 */
  onAdd: (amount: number) => void;
}

/** ⑧-b 量の記録：回ごとに足す。数字キーで1回分を入れて、合計に足す */
export function QuantityIncrementSheet({
  open,
  onClose,
  title,
  habitName,
  periodLabel,
  totalLabel,
  unit,
  target,
  total,
  items,
  onItemPress,
  onItemDelete,
  addLabel,
  decimals = 2,
  onAdd,
}: QuantityIncrementSheetProps) {
  const [text, setText] = useState("");
  // 開いたときに入力を空に戻す（描画中に前回の open と比べる。Effect は使わない）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText("");
  }
  const amount = parseQuantity(text);

  const subtitle = [
    habitName !== title ? habitName : null,
    periodLabel,
    target !== null ? `目標 ${formatQuantity(target)} ${unit}` : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      <div className="frame px-[13.5px] pt-3 pb-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold">{totalLabel}</span>
          <span className="flex items-baseline gap-1">
            <span className="font-latin text-row-number">
              {formatQuantity(total)}
            </span>
            <span className="text-caption text-gray-500">
              {target !== null ? `/ ${formatQuantity(target)} ` : ""}
              {unit}
            </span>
          </span>
        </div>
        {target !== null ? (
          <ProgressBar
            value={target > 0 ? total / target : 1}
            size="sheet"
            label="目標までの進み具合"
            className="mt-1.5"
          />
        ) : null}
        {items.length > 0 ? (
          <ul className="mt-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center border-t border-gray-300"
              >
                <button
                  type="button"
                  onClick={() => onItemPress?.(item.id)}
                  disabled={!onItemPress}
                  className="flex min-h-11 min-w-0 flex-1 items-center justify-between text-[11px] font-bold disabled:cursor-default"
                >
                  <span>{item.dateLabel}</span>
                  <span className="flex items-center gap-1.5">
                    {formatQuantity(item.quantity)} {unit}
                    {onItemPress ? (
                      <Icon name="chevron-right" size={12} strokeWidth={1.6} />
                    ) : null}
                  </span>
                </button>
                {onItemDelete ? (
                  <button
                    type="button"
                    aria-label={`${item.dateLabel} の ${formatQuantity(item.quantity)} ${unit}を削除`}
                    onClick={() => onItemDelete(item.id)}
                    className="-mr-2 ml-2 min-h-11 shrink-0 px-2 text-[11px] font-bold underline underline-offset-2"
                  >
                    削除
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 border-t border-gray-300 py-3 text-[11px] font-medium text-gray-500">
            まだ記録がありません
          </p>
        )}
      </div>

      <p className="mt-4 text-[11px] font-bold">{addLabel}</p>
      <div
        className="frame-focus mt-2 flex h-[52px] items-center justify-between px-4"
        aria-live="polite"
      >
        <span className="flex items-center">
          <span className="font-latin text-[26px] font-extrabold">
            {text === "" ? <span className="text-gray-300">0</span> : text}
          </span>
          <span
            aria-hidden="true"
            className="ml-0.5 h-7 w-px animate-pulse bg-black"
          />
        </span>
        <span className="text-[13px] font-bold">{unit}</span>
      </div>
      <NumPad
        value={text}
        onChange={setText}
        decimals={decimals}
        className="mt-2.5"
      />
      <Pill
        className="mt-4"
        disabled={amount <= 0}
        onClick={() => {
          onAdd(amount);
          setText("");
        }}
      >
        {amount > 0
          ? `${formatQuantity(amount)} ${unit} を追加（合計 ${formatQuantity(total + amount)} ${unit}）`
          : "量を入力してください"}
      </Pill>
    </BottomSheet>
  );
}
