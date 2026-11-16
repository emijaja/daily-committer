"use client";

import { useState, type TouchEvent } from "react";

/** これより短い横の移動はスワイプとみなさない（px） */
export const SWIPE_MIN_DISTANCE = 50;
/** 画面の左右の端から始めた指は無視する（iOS Safari の「戻る」のジェスチャーと重ねない） */
export const SWIPE_EDGE = 24;
/**
 * この属性のついた要素の中で始めた指は無視する。
 * 長押しのある＋（長押しのあいだに指が横にずれやすい）につける
 */
export const NO_SWIPE_ATTR = "data-no-swipe";

/**
 * 指の移動量からスワイプの向きを決める。
 * 左へ払うと 1（次へ）、右へ払うと -1（前へ）、縦スクロールや短い移動は 0。
 * dy には途中でいちばん縦に動いた量を渡す（下へスクロールして戻ってきた動きを横スワイプにしない）
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return 0;
  // 斜めの動きは縦スクロールのつもりのことが多いので、横が縦の2倍以上のときだけ
  if (Math.abs(dx) < Math.abs(dy) * 2) return 0;
  return dx < 0 ? 1 : -1;
}

interface Point {
  x: number;
  y: number;
}

interface StartContext {
  /** 画面の幅（端の判定に使う） */
  width: number;
  /** 画面に触れている指の数 */
  touches: number;
  /** NO_SWIPE_ATTR の要素の中で始めたか */
  ignored: boolean;
}

/**
 * 1回のタッチの始まりから終わりまでを追って、スワイプの向きを返す。
 * DOM に触れない純粋なロジックなので、フックの外でテストできる
 */
export function createSwipeTracker() {
  let from: Point | null = null;
  let maxDy = 0;

  return {
    start(p: Point, ctx: StartContext) {
      maxDy = 0;
      // 2本目の指が触れたときもここに来るので、つまんで拡大する動きは捨てる
      from =
        ctx.touches === 1 &&
        !ctx.ignored &&
        p.x > SWIPE_EDGE &&
        p.x < ctx.width - SWIPE_EDGE
          ? p
          : null;
    },
    move(p: Point) {
      if (from) maxDy = Math.max(maxDy, Math.abs(p.y - from.y));
    },
    end(p: Point): -1 | 0 | 1 {
      const origin = from;
      from = null;
      if (!origin) return 0;
      const dy = Math.max(maxDy, Math.abs(p.y - origin.y));
      return swipeStep(p.x - origin.x, dy);
    },
    cancel() {
      from = null;
    },
  };
}

interface SwipeOptions {
  /** 左へ払ったら 1、右へ払ったら -1 */
  onSwipe: (step: 1 | -1) => void;
  /** false のあいだは反応しない（シートやトーストを出しているときなど） */
  enabled?: boolean;
}

/** 横スワイプを拾うタッチのハンドラーを返す。要素に spread して使う */
export function useHorizontalSwipe({ onSwipe, enabled = true }: SwipeOptions) {
  const [t] = useState(createSwipeTracker);

  return {
    onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!enabled || !touch) return t.cancel();
      const target = e.target instanceof Element ? e.target : null;
      t.start(
        { x: touch.clientX, y: touch.clientY },
        {
          width: window.innerWidth,
          touches: e.touches.length,
          ignored: target?.closest(`[${NO_SWIPE_ATTR}]`) != null,
        },
      );
    },
    onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) t.move({ x: touch.clientX, y: touch.clientY });
    },
    onTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0];
      if (!touch) return t.cancel();
      const step = t.end({ x: touch.clientX, y: touch.clientY });
      // 指を置いたあとにシートやトーストが出たときも切り替えない
      if (step !== 0 && enabled) onSwipe(step);
    },
    onTouchCancel() {
      t.cancel();
    },
  };
}
