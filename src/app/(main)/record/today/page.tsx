import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { SignOutButton } from "./sign-out-button";

/** ①-a 記録：今日。フェーズ0-2 ではログインの確認用の仮の中身。画面はフェーズ2-1 で作る */
export default function TodayPage() {
  return (
    <main className="px-screen-x py-8">
      <div className="flex items-start justify-between">
        <h1 className="font-latin text-display">Today</h1>
        {/* TODO: 2-1 で歯車のアイコンにする（screens.md ①-a 右上 → ⑦） */}
        <Link href="/settings" className="text-caption underline">
          設定
        </Link>
      </div>
      <p className="text-subtitle-ja">今日の習慣を記録</p>
      <Suspense fallback={<p className="text-body mt-6">読み込み中…</p>}>
        <CurrentUserInfo />
      </Suspense>
    </main>
  );
}

async function CurrentUserInfo() {
  const user = await requireUser();
  return (
    <div className="mt-6 space-y-4">
      <p className="text-body">{user.name} さんでログイン中</p>
      <SignOutButton />
    </div>
  );
}
