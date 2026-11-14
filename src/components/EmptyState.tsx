import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
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

/**
 * 空の状態（E1〜E4）：大きなキャラ＋見出し＋説明＋ボタン、中央寄せ。
 * 余白は Figma に合わせる（キャラ→見出し 12、見出し→説明 12、説明→ボタン 28、ボタン→下線リンク 12）
 */
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
      <h2
        className={cx("text-[16px] leading-5 font-bold", expression && "mt-3")}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-body mt-3 leading-5 whitespace-pre-line text-gray-600">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-7 flex w-full max-w-[220px] flex-col items-center gap-3">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

/**
 * 空の状態の下線リンク（E1「おすすめから選ぶ」、E3「記録画面へ」）。
 * ボタンの下では 12px あけ、リンクだけのとき（E3）は説明の 12px 下に置く。
 *
 * タップ領域はリンク自体に高さ 44px を持たせて確保する。疑似要素で上下に広げると直上のボタンと
 * 重なるので、上の余白（12px）を負のマージンで打ち消して上の padding に置き換え、
 * 文字の位置は変えずに、上端を直上の要素に接する位置から下へ 44px にする。
 */
export function EmptyStateLink({
  className,
  ...rest
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "-mt-3 inline-flex min-h-11 min-w-11 justify-center pt-3 text-[12px] leading-[14px] font-bold underline underline-offset-4 first:-mt-7",
        className,
      )}
      {...rest}
    />
  );
}
