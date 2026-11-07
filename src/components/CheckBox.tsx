"use client";

import { useRef, type ButtonHTMLAttributes } from "react";
import { cx, HIT_AREA } from "./cx";
import { Icon } from "./icons";

const BOX =
  "inline-flex size-(--size-check) shrink-0 items-center justify-center border-(length:--stroke-box) border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40";

export interface CheckBoxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role" | "aria-checked"
> {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** 読み上げ用のラベル（例：読書） */
  label: string;
  /** 「次に押す所」の印として黄色にする（オンボーディング O2） */
  highlight?: boolean;
}

/** チェック：30×30 の四角・黒枠 1.5px。完了＝黒塗り＋白のチェック */
export function CheckBox({
  checked,
  onChange,
  label,
  highlight,
  className,
  ...rest
}: CheckBoxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cx(
        BOX,
        HIT_AREA,
        checked ? "bg-black text-white" : highlight ? "bg-yellow" : "bg-white",
        className,
      )}
      {...rest}
    >
      {checked ? <Icon name="check" size={16} /> : null}
    </button>
  );
}

export interface AddButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> {
  /** 読み上げ用のラベル（例：筋トレを記録） */
  label: string;
  /** 目標に届いたら黒塗りのチェックで表示する（押すとシートで追加・修正） */
  done?: boolean;
  onPress?: () => void;
  /** 長押し（前回と同じ量で即記録）。指定しないと長押しは普通の押下と同じ */
  onLongPress?: () => void;
  highlight?: boolean;
}

const LONG_PRESS_MS = 500;

/** 量の習慣の「＋」。達成後は黒塗りのチェックになる */
export function AddButton({
  label,
  done,
  onPress,
  onLongPress,
  highlight,
  className,
  ...rest
}: AddButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={() => {
        if (!onLongPress) return;
        longPressed.current = false;
        clear();
        timer.current = setTimeout(() => {
          longPressed.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        if (onLongPress) e.preventDefault();
      }}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onPress?.();
      }}
      className={cx(
        BOX,
        HIT_AREA,
        "touch-manipulation select-none",
        done ? "bg-black text-white" : highlight ? "bg-yellow" : "bg-white",
        className,
      )}
      {...rest}
    >
      <Icon name={done ? "check" : "plus"} size={16} />
    </button>
  );
}
