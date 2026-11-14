import Link from "next/link";
import type { ReactNode } from "react";
import { cx, HIT_AREA } from "@/components/cx";

/**
 * オンボーディングの画面の共通の部品（screens.md「オンボーディング」、Figma 2105:5301）。
 * 表示順は O1 → O2 → O3 → A1 → O5 → O4。ページ送りの点は A1 を除く5つ。
 */

/** ページ送りの点の位置（表示順。A1 は点を出さない） */
export const ONBOARDING_STEP = { o1: 1, o2: 2, o3: 3, o5: 4, o4: 5 } as const;
const STEP_COUNT = 5;

/** ページ送りの点：今の位置は黒の横長（20×6）、ほかは灰色の丸（6×6） */
export function PageDots({
  current,
  className = "mt-4",
}: {
  current: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${STEP_COUNT}ページ中 ${current}ページ目`}
      className={cx("flex justify-center gap-1.5", className)}
    >
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <span
          key={i}
          className={cx(
            "rounded-pill h-1.5",
            i + 1 === current ? "w-5 bg-black" : "w-1.5 bg-gray-300",
          )}
        />
      ))}
    </div>
  );
}

/** 画面の外枠。上の行（スキップ）・中央の絵・下の文とボタン */
export function OnboardingScreen({
  topRight,
  visual,
  children,
  className,
}: {
  /** 右上（スキップ）。無くても高さは取る（O1〜O3 と位置をそろえる） */
  topRight?: ReactNode;
  /** 中央の絵。残りの高さの中で上下中央に置く */
  visual?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cx("flex min-h-dvh flex-col px-6 pt-2 pb-8", className)}>
      <div className="-mr-1 flex h-6 shrink-0 items-center justify-end">
        {topRight}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-4">
        {visual}
      </div>
      {children}
    </main>
  );
}

/** 右上の「スキップ」（→ A1） */
export function SkipLink() {
  return (
    <Link
      href="/login"
      className={cx("text-[12px] font-bold text-gray-500", HIT_AREA)}
    >
      スキップ
    </Link>
  );
}

/** 英字の大見出し＋日本語の見出し＋説明 */
export function OnboardingText({
  title,
  heading,
  children,
}: {
  title: string;
  heading: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <h1 className="font-latin text-[40px] leading-12 font-black tracking-[-0.02em]">
        {title}
      </h1>
      <p className="mt-1.5 text-[18px] leading-6 font-bold">{heading}</p>
      {children ? (
        <p className="text-body mt-1.5 leading-[21px] whitespace-pre-line text-gray-600">
          {children}
        </p>
      ) : null}
    </div>
  );
}

/** 下線のテキストリンク（ログイン・通知をオンにして） */
export const UNDERLINE_LINK =
  "font-bold text-black underline underline-offset-2";
