"use client";

import { useEffect, useId, useRef } from "react";
import type { GrassCell } from "@/domain/grass";
import type { LogicalDate, WeekStart } from "@/domain/types";
import {
  daysInMonth,
  MONTH_NAMES_EN,
  toIsoDate,
  weekdayIndex,
  weekdayLabels,
} from "./calendar-layout";
import { cx, HIT_AREA } from "./cx";
import { GRASS_BG } from "./grass-colors";
import { Icon } from "./icons";

export interface CalendarModalProps {
  open: boolean;
  year: number;
  /** 1〜12 */
  month: number;
  /** その月の草（なければ記録なしとして扱う） */
  cells: readonly GrassCell[];
  weekStart: WeekStart;
  today: LogicalDate;
  /** 選んでいる日（黒塗り） */
  selected?: LogicalDate;
  onSelect: (date: LogicalDate) => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  onClose: () => void;
  /** 「今日」を押したとき */
  onToday?: () => void;
}

/** 日付を選ぶモーダル（⑥-b）。白・黒枠 1.5px・角丸0、幅 335。日付の下に草色の小さな四角 */
export function CalendarModal({
  open,
  year,
  month,
  cells,
  weekStart,
  today,
  selected,
  onSelect,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  onClose,
  onToday,
}: CalendarModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const levelOf = new Map(cells.map((c) => [c.date, c.level]));
  const first = toIsoDate(year, month, 1);
  const offset = weekdayIndex(first, weekStart);
  const count = daysInMonth(year, month);

  return (
    <div className="bg-scrim px-screen-x fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="frame relative w-full max-w-[335px] bg-white px-[17px] pt-4 pb-3 outline-none"
      >
        <div className="flex items-start">
          <div id={titleId} className="flex-1">
            <p className="font-latin text-display-sheet leading-[29px]">
              {MONTH_NAMES_EN[month - 1]}
            </p>
            <p className="text-subtitle-ja">
              {year}年 {month}月
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="前の月"
              disabled={!canPrev}
              onClick={onPrev}
              className={cx(
                "frame flex size-[30px] items-center justify-center disabled:opacity-30",
                HIT_AREA,
              )}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              aria-label="次の月"
              disabled={!canNext}
              onClick={onNext}
              className={cx(
                "frame flex size-[30px] items-center justify-center disabled:opacity-30",
                HIT_AREA,
              )}
            >
              <Icon name="chevron-left" size={16} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className={cx(
                "ml-2 flex size-[30px] items-center justify-center",
                HIT_AREA,
              )}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center">
          {weekdayLabels(weekStart).map((w) => (
            <span key={w} className="text-[9px] font-bold text-gray-500">
              {w}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const day = i + 1;
            const date = toIsoDate(year, month, day) as LogicalDate;
            const level = levelOf.get(date) ?? 0;
            const future = date > today;
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                aria-pressed={isSelected}
                aria-label={`${month}月${day}日${date === today ? "（今日）" : ""}`}
                onClick={() => onSelect(date)}
                className={cx(
                  "font-latin mx-auto flex h-[46px] w-[41px] flex-col items-center justify-center gap-1.5 text-[14px] font-bold",
                  isSelected ? "bg-black text-white" : "text-black",
                  future && "text-gray-300",
                )}
              >
                {day}
                <span
                  aria-hidden="true"
                  className={cx(
                    "size-[7px]",
                    isSelected
                      ? "bg-yellow"
                      : future
                        ? "bg-grass-0 opacity-40"
                        : level === 0
                          ? "border border-gray-300 bg-white"
                          : GRASS_BG[level],
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-300 pt-1">
          <p className="text-[9px] font-medium text-gray-500">
            日付を選ぶと、その日の記録を開きます
          </p>
          {onToday ? (
            <button
              type="button"
              onClick={onToday}
              className="min-h-11 text-[12px] font-bold underline underline-offset-2"
            >
              今日
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
