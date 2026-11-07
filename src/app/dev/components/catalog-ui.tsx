import type { ReactNode } from "react";

/** カタログの区切り（部品ごとの見出し＋Figma のノード） */
export function CatalogSection({
  id,
  title,
  figma,
  children,
}: {
  id: string;
  title: string;
  /** 見比べる Figma のノードID */
  figma?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-4">
      <h2 className="font-latin border-b-2 border-black pb-1 text-[18px] font-extrabold">
        {title}
      </h2>
      {figma ? (
        <p className="text-caption mt-1 text-gray-500">Figma: {figma}</p>
      ) : null}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

/** 状態ごとの見本 */
export function Sample({
  label,
  children,
  bleed,
}: {
  label: string;
  children: ReactNode;
  /** 左右の余白を打ち消して画面幅いっぱいに出す */
  bleed?: boolean;
}) {
  return (
    <div>
      <div className="text-caption mb-1.5 text-gray-500">{label}</div>
      <div className={bleed ? "-mx-screen-x" : undefined}>{children}</div>
    </div>
  );
}
