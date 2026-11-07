"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 下部タブ（仮）。記録／振り返り／習慣の3つ（product-and-flow.md）。⑦ 設定は ①の歯車から開く。黒地、選択中は白・非選択は tabbar-inactive（visual-style.md）。
 * TODO: レーンB の TabBar（src/components/）ができたら差し替える。アイコンもそちらで付く。
 */
const TABS = [
  { label: "記録", href: "/record/today", match: "/record" },
  { label: "振り返り", href: "/review", match: "/review" },
  { label: "習慣", href: "/habits", match: "/habits" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインメニュー"
      className="sticky bottom-0 bg-black pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active =
            pathname === tab.match || pathname.startsWith(`${tab.match}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`text-caption flex h-14 items-center justify-center font-bold ${
                  active ? "text-white" : "text-tabbar-inactive"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
