"use client";

import { usePathname } from "next/navigation";
import { TabBar, type TabKey } from "@/components/TabBar";

/**
 * 下部タブを出す画面（タブの最上位の画面）と、そのときの選択中のタブ。
 * 戻るボタンのある画面（② 記録の確認・修正、③ 習慣の詳細、⑤ 追加・編集、⑦ 設定）には出さない（Figma に合わせる）。
 */
function tabFor(pathname: string): TabKey | null {
  if (/^\/record\/(today|week|month)\/?$/.test(pathname)) return "record";
  if (/^\/review\/?$/.test(pathname)) return "review";
  if (/^\/habits\/?$/.test(pathname)) return "habits";
  return null;
}

/** (main) の下部タブ。今のパスから、出すかどうかと選択中のタブを決める */
export function MainTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const current = tabFor(pathname);
  if (!current) return null;
  return <TabBar current={current} className={className} />;
}
