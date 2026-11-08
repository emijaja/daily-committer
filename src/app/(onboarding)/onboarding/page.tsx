import Link from "next/link";

/**
 * オンボーディングの仮のページ。onboarded_at が NULL のユーザーは (main) からここへ移る。
 * O1〜O5 は /onboarding/[step] としてフェーズ3-1 で作る（architecture.md 2章・5章）。
 */
export default function OnboardingPage() {
  return (
    <main className="px-screen-x py-8">
      <h1 className="font-latin text-display">Hello,</h1>
      <p className="text-subtitle-ja">ゆるく、続ける。</p>
      <p className="text-body mt-6 text-gray-500">
        オンボーディングはフェーズ3で作ります。
      </p>
      <Link href="/login" className="text-body mt-6 inline-block underline">
        ログイン
      </Link>
    </main>
  );
}
