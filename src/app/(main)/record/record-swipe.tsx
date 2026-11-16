"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { useHorizontalSwipe } from "@/components/use-swipe";
import type { Period } from "@/domain/types";
import { PERIOD_HREF, PERIODS } from "./record-format";

/** 中の画面からスワイプを止めるための関数 */
const BlockSwipeContext = createContext<(blocked: boolean) => void>(() => {});

/**
 * 記録の画面の <main>。左右に払うと 今日 ⇄ 今週 ⇄ 今月 を切り替える（端では何もしない）。
 * 見出しや、リストの下の空白でも反応するように、画面全体（下部タブの上まで）に広げる
 */
export function RecordSwipeArea({
  period,
  className,
  children,
}: {
  period: Period;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const swipe = useHorizontalSwipe({
    enabled: !blocked,
    onSwipe: (step) => {
      const next = PERIODS[PERIODS.indexOf(period) + step];
      // タブを切り替えるだけの操作なので、履歴は積まない（タブのリンクと同じ）
      if (next) router.replace(PERIOD_HREF[next]);
    },
  });
  return (
    <BlockSwipeContext value={setBlocked}>
      <main className={className} {...swipe}>
        {children}
      </main>
    </BlockSwipeContext>
  );
}

/**
 * blocked が true のあいだスワイプを止める。
 * シートの中の操作（タッチは親まで伝わる）や、取り消しのトースト・保存中の操作を、画面の切り替えで失わないため
 */
export function useBlockRecordSwipe(blocked: boolean) {
  const setBlocked = use(BlockSwipeContext);
  useEffect(() => {
    setBlocked(blocked);
    return () => setBlocked(false);
  }, [setBlocked, blocked]);
}
