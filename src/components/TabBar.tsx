import Link from "next/link";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

export type TabKey = "record" | "review" | "habits";

const TABS: readonly {
  key: TabKey;
  label: string;
  href: string;
  icon: IconName;
}[] = [
  { key: "record", label: "記録", href: "/record/today", icon: "tab-record" },
  { key: "review", label: "振り返り", href: "/review", icon: "tab-review" },
  { key: "habits", label: "習慣", href: "/habits", icon: "tab-habits" },
];

export interface TabBarProps {
  /** 選択中のタブ */
  current: TabKey;
  /** タブの行き先を変える場合（既定は /record/today・/review・/habits） */
  hrefs?: Partial<Record<TabKey, string>>;
  className?: string;
}

/**
 * 下部タブ：黒地、アイコン＋ラベル。選択中は白・非選択は #8A8A8A。
 * 画面下への固定は使う側（レイアウト）で行う。下端はホームバーの分だけ余白をとる。
 */
export function TabBar({ current, hrefs, className }: TabBarProps) {
  return (
    <nav
      aria-label="メイン"
      className={cx(
        "flex bg-black px-2 pt-2.5 pb-[max(env(safe-area-inset-bottom),28px)]",
        className,
      )}
    >
      {TABS.map((tab) => {
        const selected = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={hrefs?.[tab.key] ?? tab.href}
            aria-current={selected ? "page" : undefined}
            className={cx(
              "flex min-h-11 flex-1 flex-col items-center gap-1 text-[10px] leading-3 font-bold",
              selected ? "text-white" : "text-tabbar-inactive",
            )}
          >
            <Icon name={tab.icon} size={22} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
