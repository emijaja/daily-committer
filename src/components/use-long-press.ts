"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

/** 長押しとみなす時間（ms） */
export const LONG_PRESS_MS = 500;
/** 押しているあいだにこれ以上指が動いたら、長押しをやめる（スクロールのつもり。px） */
export const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * ボタンの長押し（□／＋の長押しでひとことを書く。screens.md「記録の操作」）。
 * 返すハンドラーをボタンにそのまま渡す。onLongPress がなければ普通のボタンと同じ。
 * - 長押しが成立したら、指を離したときのクリック（onPress）は呼ばない
 * - 押しているあいだに指が動いたら（スクロール）長押しにしない
 * - 長押しでブラウザのメニュー（コンテキストメニュー）を出さない
 */
export function useLongPress({
  onPress,
  onLongPress,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!onLongPress) return;
      // マウスの右ボタンなどは対象にしない
      if (e.pointerType === "mouse" && e.button !== 0) return;
      longPressed.current = false;
      clear();
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        longPressed.current = true;
        timer.current = null;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const from = start.current;
      if (!from || !timer.current) return;
      const moved = Math.hypot(e.clientX - from.x, e.clientY - from.y);
      if (moved > LONG_PRESS_MOVE_TOLERANCE) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      if (!onLongPress) return;
      e.preventDefault();
      // 指で押しているあいだ（長押しの判定中・成立後）は、タイマーに任せる。
      // それ以外（マウスの右クリック・キーボードのメニューキー）は、長押しの代わりにする
      if (timer.current || longPressed.current || start.current) return;
      onLongPress();
    },
    onClick: () => {
      if (longPressed.current) {
        longPressed.current = false;
        return;
      }
      onPress?.();
    },
  };
}
