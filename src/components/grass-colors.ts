import type { GrassLevel } from "@/domain/grass";

/**
 * 草の段階ごとの背景色（GrassHeatmap・CalendarModal・O3）。
 * Server Component からも読めるよう、"use client" のモジュールには置かない。
 */
export const GRASS_BG: Record<GrassLevel, string> = {
  0: "bg-grass-0",
  1: "bg-grass-1",
  2: "bg-grass-2",
  3: "bg-grass-3",
};
