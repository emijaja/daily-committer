import type { ReactNode } from "react";
import { cx } from "./cx";

export interface MarkerProps {
  children: ReactNode;
  className?: string;
}

/** 強調マーカー：黄色の帯の上に太字（例：あと 10 回で目標） */
export function Marker({ children, className }: MarkerProps) {
  return (
    <mark
      className={cx(
        "bg-yellow box-decoration-clone px-1 py-px font-bold text-black",
        className,
      )}
    >
      {children}
    </mark>
  );
}
