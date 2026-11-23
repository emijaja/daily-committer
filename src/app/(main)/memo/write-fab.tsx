import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * ⑨・⑨-d の右下の黒い丸の「書く」ボタン（58px）。下部タブの上に固定する。
 * 画面の幅（最大 430px）の右端から 20px に置く。
 */
export function WriteFab({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="メモを書く"
      className="fixed right-[max(20px,calc((100vw-430px)/2+20px))] bottom-[calc(max(env(safe-area-inset-bottom),28px)+64px)] z-30 flex size-[58px] items-center justify-center rounded-full bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
    >
      <Icon name="compose" size={26} />
    </Link>
  );
}
