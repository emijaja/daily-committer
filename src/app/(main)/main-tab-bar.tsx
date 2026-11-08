"use client";

import { usePathname } from "next/navigation";
import { TabBar, type TabKey } from "@/components/TabBar";

/** 今のパスから選択中のタブを決める。⑦ 設定（/settings）は ①-a の歯車から開くので「記録」を選択中にする */
function currentTab(pathname: string): TabKey {
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/habits")) return "habits";
  return "record";
}

/** (main) の下部タブ。部品の TabBar に、今のパスから選択中のタブを渡す */
export function MainTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  return <TabBar current={currentTab(pathname)} className={className} />;
}
