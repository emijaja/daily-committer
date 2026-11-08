"use client";

import { usePathname } from "next/navigation";
import { TabBar, type TabKey } from "@/components/TabBar";

/**
 * 今のパスから、下部タブの選択中のタブを決める（Figma に合わせる）。
 * - ⑤ 習慣の追加・編集（/habits/new、/habits/[id]/edit）と、おすすめから選ぶ（/habits/presets）は
 *   下部タブを出さない（null）。どれも習慣を追加・編集する途中の画面で、下に主ボタンがあるため
 * - ② 記録の確認・修正は「振り返り」、③ 習慣の詳細は「習慣」、⑦ 設定は ①-a の歯車から開くので「記録」
 */
function tabFor(pathname: string): TabKey | null {
  if (/^\/habits\/(new|presets|[^/]+\/edit)\/?$/.test(pathname)) return null;
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/habits")) return "habits";
  return "record";
}

/** (main) の下部タブ。今のパスから、出すかどうかと選択中のタブを決める */
export function MainTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const current = tabFor(pathname);
  if (!current) return null;
  return <TabBar current={current} className={className} />;
}
