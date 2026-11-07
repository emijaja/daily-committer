import type { ReactNode } from "react";
import { cx } from "./cx";

export interface TagProps {
  /** solid: 強調（黒塗り白文字。例 STREAK 6、DAILY）／outline: 補足（白地・黒枠。例 読書 6日連続） */
  variant?: "solid" | "outline";
  children: ReactNode;
  className?: string;
}

/** ピル型のタグ。黒枠 1.2px。英字は Inter Extra Bold・字間 +4% */
export function Tag({ variant = "solid", children, className }: TagProps) {
  return (
    <span
      className={cx(
        "rounded-pill inline-flex h-[17.4px] shrink-0 items-center border-(length:--stroke-tag) border-black px-2 leading-none whitespace-nowrap",
        "font-latin text-tag",
        variant === "solid" ? "bg-black text-white" : "bg-white text-black",
        className,
      )}
    >
      {children}
    </span>
  );
}
