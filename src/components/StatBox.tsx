import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icons";

export interface StatBoxProps {
  /** 上の見出し（例：読書、最長連続） */
  label: ReactNode;
  /** 大きな数字（例 27、1.8） */
  value: ReactNode;
  /** 数字の前の言葉（例：週3回 の「週」） */
  prefix?: ReactNode;
  /** 数字の右の単位（例：日、/ 31日、2024年） */
  unit?: ReactNode;
  /** 下の補足（例：連続で継続中） */
  caption?: ReactNode;
  /** lg: ⑥-a の達成していること（数字 28）／md: ③ の数字の箱（数字 22） */
  size?: "lg" | "md";
  className?: string;
}

/** 数字の箱（黒枠） */
export function StatBox({
  label,
  value,
  prefix,
  unit,
  caption,
  size = "lg",
  className,
}: StatBoxProps) {
  return (
    <div
      className={cx(
        "frame bg-white px-[13.5px]",
        size === "lg" ? "pt-3.5 pb-3" : "pt-3 pb-2.5",
        className,
      )}
    >
      <p
        className={cx(
          "font-bold",
          size === "lg" ? "text-[11px]" : "text-[10px]",
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1">
        {prefix ? (
          <span
            className={cx(
              // 「週3」のように数字とくっつける
              "-mr-1 font-black",
              size === "lg" ? "text-[26px] leading-8" : "text-[20px]",
            )}
          >
            {prefix}
          </span>
        ) : null}
        <span
          className={cx(
            "font-latin font-black tracking-[-0.02em]",
            size === "lg" ? "text-[28px] leading-8" : "text-[22px] leading-7",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-[11px] font-bold">{unit}</span> : null}
      </p>
      {caption ? (
        <p className="mt-1 text-[10px] font-medium text-gray-600">{caption}</p>
      ) : null}
    </div>
  );
}

export interface StatMoreBoxProps {
  /** 上の文字（例：ほか 4件） */
  label: ReactNode;
  /** 下の文字（既定：すべて見る） */
  action?: ReactNode;
  /** 押したとき（一覧を開く）。押せない箱にはしないので必須 */
  onPress: () => void;
  className?: string;
}

/** 黒い箱「ほか 4件 すべて見る ＞」 */
export function StatMoreBox({
  label,
  action = "すべて見る",
  onPress,
  className,
}: StatMoreBoxProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cx(
        "flex min-h-11 flex-col justify-between bg-black px-[13.5px] pt-3.5 pb-3 text-left text-white",
        className,
      )}
    >
      <span className="text-[11px] font-bold">{label}</span>
      <span className="flex w-full items-center justify-between text-[14px] font-bold">
        {action}
        <Icon name="chevron-right" size={16} strokeWidth={2} />
      </span>
    </button>
  );
}
