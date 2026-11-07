/** フェーズ2で中身を作るまでの仮のページ。見出しは screens.md の英字見出し＋日本語の小見出し */
export function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <main className="px-screen-x py-8">
      <h1 className="font-latin text-display">{title}</h1>
      <p className="text-subtitle-ja">{subtitle}</p>
      <p className="text-body mt-6 text-gray-500">
        この画面はフェーズ2で作ります。
      </p>
    </main>
  );
}
