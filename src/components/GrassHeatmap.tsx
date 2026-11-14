"use client";

import type { ReactNode } from "react";
import type { GrassCell, GrassLevel } from "@/domain/grass";
import type { LogicalDate, WeekStart } from "@/domain/types";
import { monthOf, weekdayIndex } from "./calendar-layout";
import { cx, HIT_AREA } from "./cx";
import { GRASS_BG } from "./grass-colors";
import { Icon } from "./icons";

export interface GrassHeatmapProps {
  /** 期間の最初の日から順に、1日1マス（domain の allHabitsGrass / habitGrass の結果） */
  cells: readonly GrassCell[];
  weekStart: WeekStart;
  /** 今日。これより後の日は「未来」として薄く出す */
  today: LogicalDate;
  /** 今日のマスを黄色にする（記録がまだない E3） */
  highlightToday?: boolean;
  /** マスを押したとき（その月のカレンダーを開く）。月のラベルを押すと、その月の最初の日で呼ぶ */
  onCellPress?: (date: LogicalDate) => void;
  className?: string;
}

/** 年間の草：53週 × 7日のマス。マス間 1.2px、角丸なし。上に月のラベル */
export function GrassHeatmap({
  cells,
  weekStart,
  today,
  highlightToday,
  onCellPress,
  className,
}: GrassHeatmapProps) {
  const first = cells[0];
  const offset = first ? weekdayIndex(first.date, weekStart) : 0;
  const columns = Math.max(1, Math.ceil((offset + cells.length) / 7));

  // 各月の1日が入る列
  const months: { month: number; column: number; date: LogicalDate }[] = [];
  cells.forEach((cell, i) => {
    const m = monthOf(cell.date);
    if (i === 0 || cell.date.endsWith("-01")) {
      if (!months.some((x) => x.month === m)) {
        months.push({
          month: m,
          column: Math.floor((offset + i) / 7),
          date: cell.date,
        });
      }
    }
  });

  return (
    <div className={className}>
      <div className="relative h-4">
        {months.map((m) =>
          onCellPress ? (
            <button
              key={m.month}
              type="button"
              onClick={() => onCellPress(m.date)}
              aria-label={`${m.month}月のカレンダーを開く`}
              // 文字は小さいので、押せる範囲を周りへ広げる
              className="font-latin absolute top-0 text-[9px] leading-4 font-bold text-gray-500 after:absolute after:-inset-x-2.5 after:-inset-y-3.5 after:content-['']"
              style={{ left: `${(m.column / columns) * 100}%` }}
            >
              {m.month}
            </button>
          ) : (
            <span
              key={m.month}
              className="font-latin absolute top-0 text-[9px] leading-4 font-bold text-gray-500"
              style={{ left: `${(m.column / columns) * 100}%` }}
            >
              {m.month}
            </span>
          ),
        )}
      </div>
      <div
        role="img"
        aria-label={`${cells.length}日分の草`}
        className={cx(
          "mt-2 grid grid-flow-col grid-rows-7 gap-[1.2px]",
          onCellPress && "cursor-pointer",
        )}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        onClick={(e) => {
          const date = (e.target as HTMLElement).dataset.date;
          if (date && onCellPress) onCellPress(date as LogicalDate);
        }}
      >
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {cells.map((cell) => {
          const future = cell.date > today;
          const isToday = cell.date === today;
          return (
            <span
              key={cell.date}
              data-date={future ? undefined : cell.date}
              className={cx(
                "aspect-square",
                highlightToday && isToday
                  ? "bg-yellow"
                  : future
                    ? "bg-grass-0 opacity-40"
                    : GRASS_BG[cell.level],
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export interface GrassLegendProps {
  /** levels: 少 ■■■■ 多／binary: なし ■ あり */
  mode?: "levels" | "binary";
  className?: string;
}

/** 草の凡例 */
export function GrassLegend({ mode = "levels", className }: GrassLegendProps) {
  const levels: GrassLevel[] = mode === "levels" ? [0, 1, 2, 3] : [0, 3];
  return (
    <div
      className={cx(
        "flex items-center gap-1 text-[9px] font-medium text-gray-500",
        className,
      )}
    >
      <span className="mr-0.5">{mode === "levels" ? "少" : "なし"}</span>
      {levels.map((l) => (
        <span key={l} className={cx("size-2", GRASS_BG[l])} />
      ))}
      <span className="ml-0.5">{mode === "levels" ? "多" : "あり"}</span>
    </div>
  );
}

export interface GrassCardProps extends GrassHeatmapProps {
  /** 大きな年（例 2024） */
  year: number;
  /** 年の右の補足（例：記録 499件、読書の記録 212日） */
  summary?: ReactNode;
  /** 前の年・次の年 */
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  /** 凡例（levels: 4段階／binary: 2値／none: 出さない） */
  legend?: "levels" | "binary" | "none";
  /** 下のヒント（既定：草をタップで、その月のカレンダーへ）。null で出さない */
  hint?: ReactNode;
}

/** 年間の草のカード（⑥-a・③・O3・E3） */
export function GrassCard({
  year,
  summary,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  legend = "levels",
  hint = "草をタップで、その月のカレンダーへ",
  className,
  ...heatmap
}: GrassCardProps) {
  const showNav = onPrev || onNext;
  return (
    <section
      className={cx("frame bg-white px-[13.5px] pt-[18px] pb-4", className)}
    >
      <div className="flex items-center gap-2.5">
        <h3 className="font-latin text-[24px] leading-7 font-black tracking-[-0.02em]">
          {year}
        </h3>
        {summary ? (
          <span className="text-[10px] font-bold text-gray-500">{summary}</span>
        ) : null}
        {showNav ? (
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="前の年"
              disabled={!canPrev}
              onClick={onPrev}
              className={cx("text-black disabled:text-gray-300", HIT_AREA)}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              aria-label="次の年"
              disabled={!canNext}
              onClick={onNext}
              className={cx("text-black disabled:text-gray-300", HIT_AREA)}
            >
              <Icon name="chevron-left" size={16} className="rotate-180" />
            </button>
          </div>
        ) : null}
      </div>
      <GrassHeatmap {...heatmap} className="mt-3" />
      {hint !== null || legend !== "none" ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          {hint !== null ? (
            <p className="text-[10px] font-medium text-gray-500">{hint}</p>
          ) : (
            <span />
          )}
          {legend !== "none" ? <GrassLegend mode={legend} /> : null}
        </div>
      ) : null}
    </section>
  );
}
