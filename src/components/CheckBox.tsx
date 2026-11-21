"use client";

import type { ButtonHTMLAttributes } from "react";
import { cx, HIT_AREA } from "./cx";
import { Icon } from "./icons";
import { useLongPress } from "./use-long-press";
import { NO_SWIPE_ATTR } from "./use-swipe";

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
  /** 長押し（ひとことを書く）。右クリック・メニューキーでも呼ぶ。指定しないと長押しは普通の押下と同じ */
  onLongPress?: () => void;
}

/** 長押しのあるボタンにつける属性。指が横にずれても画面のスワイプにせず、長押しで文字を選ばない */
function longPressProps(onLongPress: (() => void) | undefined) {
  return onLongPress ? { [NO_SWIPE_ATTR]: "" } : {};
}

/** チェック：30×30 の四角・黒枠 1.5px。完了＝黒塗り＋白のチェック */
export function CheckBox({
  checked,
  onChange,
  label,
  highlight,
  onLongPress,
  className,
  ...rest
}: CheckBoxProps) {
  const press = useLongPress({
    onPress: () => onChange?.(!checked),
    onLongPress,
  });
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      {...longPressProps(onLongPress)}
      {...press}
      className={cx(
        BOX,
        HIT_AREA,
        onLongPress && "touch-manipulation select-none",
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
  /** 長押し（ひとことを書く）。右クリック・メニューキーでも呼ぶ。指定しないと長押しは普通の押下と同じ */
  onLongPress?: () => void;
  highlight?: boolean;
}

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
  const press = useLongPress({ onPress, onLongPress });
  return (
    <button
      type="button"
      aria-label={label}
      // 長押しのあとに指が横にずれても、画面のスワイプにしない（シートが開いて画面が変わるため）
      {...longPressProps(onLongPress)}
      {...press}
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
