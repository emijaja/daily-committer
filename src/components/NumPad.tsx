"use client";

import { cx } from "./cx";
import { Icon } from "./icons";
import { applyNumPadKey, type NumPadKey, type NumPadOptions } from "./quantity";

const KEYS: readonly NumPadKey[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "backspace",
];

export interface NumPadProps extends NumPadOptions {
  /** 入力中の文字列（例 "2.5"） */
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

/** 数字キー：黒枠 1.5px の四角（1〜9 . 0 ⌫）。小数を使わないときは . を押せない */
export function NumPad({
  value,
  onChange,
  className,
  ...options
}: NumPadProps) {
  const noDecimal = options.decimals === 0;
  return (
    <div className={cx("grid grid-cols-3 gap-1.5", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === "backspace" ? "1文字消す" : undefined}
          disabled={key === "." && noDecimal}
          onClick={() => onChange(applyNumPadKey(value, key, options))}
          className="frame font-latin flex h-11 items-center justify-center bg-white text-[16px] font-bold active:bg-gray-100 disabled:opacity-30"
        >
          {key === "backspace" ? <Icon name="backspace" size={18} /> : key}
        </button>
      ))}
    </div>
  );
}
