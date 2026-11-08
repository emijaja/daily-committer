"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx, HIT_AREA } from "./cx";
import { Icon } from "./icons";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** 英字の見出し（例 Workout） */
  title: string;
  /** 見出しの下の日本語（例：筋トレ ・ 11月1日（金）・ 目標 30 回） */
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * ボトムシート：白・黒枠 1.5px、上辺のみ角丸 18、取っ手は黒 36×4。背景の暗幕は黒 45%。
 * 暗幕を押す・Esc・× で onClose を呼ぶ。
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bg-scrim fixed inset-0 z-50">
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "frame rounded-t-sheet-top absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto border-b-0 bg-white outline-none",
          "px-screen-x pt-2.5 pb-[max(env(safe-area-inset-bottom),20px)]",
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-9 rounded-full bg-black"
        />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-latin text-display-sheet leading-[29px]"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="text-subtitle-ja mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className={cx("mt-1 shrink-0", HIT_AREA)}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="mt-3.5">{children}</div>
      </div>
    </div>
  );
}
