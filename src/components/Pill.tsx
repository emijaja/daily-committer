import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx, HIT_AREA } from "./cx";

export type PillVariant = "primary" | "secondary";
/** lg: 画面下の主ボタン（高さ 52・幅いっぱい）／md: まとめて記録する（高さ 36）／sm: 保存（高さ 28） */
export type PillSize = "lg" | "md" | "sm";

interface PillStyleProps {
  variant?: PillVariant;
  size?: PillSize;
  /** 幅いっぱいにする（lg の既定は true） */
  block?: boolean;
  /** 文字の右に置くアイコンなど */
  trailing?: ReactNode;
  /** 文字の左に置くアイコンなど */
  leading?: ReactNode;
}

function pillClass({
  variant = "primary",
  size = "lg",
  block,
  className,
}: PillStyleProps & { className?: string }) {
  const isBlock = block ?? size === "lg";
  return cx(
    "rounded-pill inline-flex shrink-0 items-center justify-center gap-1.5 font-bold whitespace-nowrap select-none",
    "transition-opacity active:opacity-70 disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
    variant === "primary" ? "bg-black text-white" : "frame bg-white text-black",
    size === "lg" && "h-(--size-button-height) px-6 text-[15px]",
    size === "md" && cx("h-9 px-[22px] text-[12px]", HIT_AREA),
    size === "sm" && cx("h-7 px-3.5 text-[12px]", HIT_AREA),
    isBlock && "w-full",
    className,
  );
}

export type PillProps = PillStyleProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

/** ピル型のボタン。主＝黒地に白文字、副＝白地に黒枠 */
export function Pill({
  variant,
  size,
  block,
  leading,
  trailing,
  className,
  children,
  type = "button",
  ...rest
}: PillProps) {
  return (
    <button
      type={type}
      className={pillClass({ variant, size, block, className })}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}

export type PillLinkProps = PillStyleProps & ComponentProps<typeof Link>;

/** 見た目は Pill のリンク（画面の移動に使う） */
export function PillLink({
  variant,
  size,
  block,
  leading,
  trailing,
  className,
  children,
  ...rest
}: PillLinkProps) {
  return (
    <Link className={pillClass({ variant, size, block, className })} {...rest}>
      {leading}
      {children}
      {trailing}
    </Link>
  );
}
