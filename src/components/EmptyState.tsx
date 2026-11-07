import type { ReactNode } from "react";
import type { Expression } from "@/domain/types";
import { cx } from "./cx";
import { Mascot } from "./Mascot";

export interface EmptyStateProps {
  /** キャラの表情。null ならキャラを出さない（E4 など） */
  expression?: Expression | null;
  /** キャラの幅（既定 230） */
  mascotSize?: number;
  /** 見出し（例：まだ習慣がありません） */
  title: ReactNode;
  /** 説明（改行は \n で） */
  description?: ReactNode;
  /** ボタンなど（Pill・PillLink・下線リンク） */
  actions?: ReactNode;
  className?: string;
}

/** 空の状態（E1〜E4）：大きなキャラ＋見出し＋説明＋ボタン、中央寄せ */
export function EmptyState({
  expression = "normal",
  mascotSize = 230,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cx(
        "px-screen-x flex flex-col items-center text-center",
        className,
      )}
    >
      {expression ? (
        <Mascot expression={expression} size={mascotSize} label="" />
      ) : null}
      <h2 className={cx("text-[16px] font-bold", expression && "mt-5")}>
        {title}
      </h2>
      {description ? (
        <p className="text-body mt-2.5 leading-[1.65] whitespace-pre-line text-gray-600">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-7 flex w-full max-w-[220px] flex-col items-center gap-2">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
