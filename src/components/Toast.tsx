"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

export interface ToastProps {
  /** 表示するかどうか */
  open: boolean;
  /** 例：筋トレ 25 回を記録しました */
  message: ReactNode;
  /** 取り消しのボタンの文字（既定「取り消す」）。onAction がないときは出さない */
  actionLabel?: string;
  onAction?: () => void;
  /** 自動で閉じるまでの時間（ms）。0 なら閉じない。閉じるときに onClose を呼ぶ */
  duration?: number;
  onClose?: () => void;
  /**
   * true なら画面の下（下部タブの上）に固定して出す。
   * false なら置いた場所にそのまま出す（カタログなど）
   */
  floating?: boolean;
  className?: string;
}

/** 黒いトースト（取り消しつき）。例「筋トレ 25 回を記録しました　取り消す」 */
export function Toast({
  open,
  message,
  actionLabel = "取り消す",
  onAction,
  duration = 4000,
  onClose,
  floating = true,
  className,
}: ToastProps) {
  // onClose が描画ごとに変わってもタイマーを張り直さない
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || duration <= 0) return;
    const id = setTimeout(() => onCloseRef.current?.(), duration);
    return () => clearTimeout(id);
  }, [open, duration, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        floating &&
          "px-screen-x pointer-events-none fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),28px)+64px)] z-40 mx-auto max-w-[430px]",
        className,
      )}
    >
      {open ? (
        <div className="pointer-events-auto flex min-h-11 items-center gap-3 bg-black py-1 pr-1 pl-4 text-[12px] font-bold text-white">
          <span className="min-w-0 flex-1">{message}</span>
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="min-h-11 shrink-0 px-3 underline underline-offset-2"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
