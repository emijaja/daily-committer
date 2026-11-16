"use client";

import { useRef, type TouchEvent } from "react";

/** これより短い横の移動はスワイプとみなさない（px） */
export const SWIPE_MIN_DISTANCE = 50;
/** 画面の左右の端から始めた指は無視する（iOS Safari の「戻る」のジェスチャーと重ねない） */
export const SWIPE_EDGE = 24;

/**
 * 指の移動量からスワイプの向きを決める。
 * 左へ払うと 1（次へ）、右へ払うと -1（前へ）、縦スクロールや短い移動は 0。
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return 0;
  // 斜めの動きは縦スクロールのつもりのことが多いので、横が縦の2倍以上のときだけ
  if (Math.abs(dx) < Math.abs(dy) * 2) return 0;
  return dx < 0 ? 1 : -1;
}

interface SwipeOptions {
  /** 左へ払ったら 1、右へ払ったら -1 */
  onSwipe: (step: 1 | -1) => void;
  /** false のあいだは反応しない（シートを開いているときなど） */
  enabled?: boolean;
}

/** 横スワイプを拾うタッチのハンドラーを返す。要素に spread して使う */
export function useHorizontalSwipe({ onSwipe, enabled = true }: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      const width = window.innerWidth;
      start.current =
        enabled &&
        t &&
        e.touches.length === 1 &&
        t.clientX > SWIPE_EDGE &&
        t.clientX < width - SWIPE_EDGE
          ? { x: t.clientX, y: t.clientY }
          : null;
    },
    onTouchEnd(e: TouchEvent) {
      const from = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!from || !t || !enabled) return;
      const step = swipeStep(t.clientX - from.x, t.clientY - from.y);
      if (step !== 0) onSwipe(step);
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
