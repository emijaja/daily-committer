import { notFound } from "next/navigation";
import { BasicSection } from "./section-basic";

/**
 * 部品のカタログ（開発環境のみ）。レーン B の部品はここに並べて Figma と見比べる。
 * 部品を追加したら、このページに見本を1つ足すこと。
 */
const colors = [
  "black",
  "white",
  "yellow",
  "gray-100",
  "gray-200",
  "gray-300",
  "gray-500",
  "gray-600",
  "tabbar-inactive",
  "grass-0",
  "grass-1",
  "grass-2",
  "grass-3",
] as const;

const texts = [
  { cls: "font-latin text-display", label: "display", sample: "Today" },
  {
    cls: "font-latin text-display-sheet",
    label: "display-sheet",
    sample: "Workout",
  },
  { cls: "font-latin text-big-number", label: "big-number", sample: "2 / 3" },
  { cls: "font-latin text-row-number", label: "row-number", sample: "20 / 30" },
  { cls: "text-row-title", label: "row-title", sample: "読書" },
  { cls: "text-subtitle-ja", label: "subtitle-ja", sample: "今日の習慣を記録" },
  {
    cls: "text-body",
    label: "body",
    sample: "早起きはまた明日かぁ…。でも読書と筋トレはえらい。",
  },
  {
    cls: "text-caption text-gray-500",
    label: "caption",
    sample: "21:04 ・ 今日の残り 1",
  },
  { cls: "font-latin text-tag", label: "tag", sample: "STREAK 6" },
] as const;

export default function ComponentsCatalog() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="px-screen-x py-8">
      <h1 className="font-latin text-display">Catalog</h1>
      <p className="text-subtitle-ja">部品のカタログ（開発環境のみ）</p>

      <section className="mt-8">
        <h2 className="text-row-title">色</h2>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {colors.map((c) => (
            <li key={c} className="text-caption">
              <div
                className="frame h-10"
                style={{ background: `var(--color-${c})` }}
              />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-row-title">文字</h2>
        <ul className="mt-3 space-y-3">
          {texts.map((t) => (
            <li key={t.label}>
              <div className={t.cls}>{t.sample}</div>
              <div className="text-caption text-gray-500">{t.label}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-row-title">枠・形</h2>
        <div className="mt-3 space-y-3">
          <div className="frame px-row-x py-row-y text-row-title">
            リストの箱（frame）
          </div>
          <div className="frame-focus h-(--size-input-height) px-3 leading-[42px]">
            入力欄（フォーカス）
          </div>
          <div className="rounded-pill flex h-(--size-button-height) items-center justify-center bg-black font-bold text-white">
            主ボタン
          </div>
          <div className="bg-yellow inline-block px-1 font-bold">
            強調マーカー
          </div>
        </div>
      </section>

      <BasicSection />
    </main>
  );
}
