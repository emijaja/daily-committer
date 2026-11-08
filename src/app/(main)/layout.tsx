import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { isOnboarded } from "@/server/services/settings";
import { MainTabBar } from "./main-tab-bar";

/**
 * 下部タブのある画面の外枠（architecture.md 2章・5章）。
 * Cache Components のため、セッションと設定を読む部分（OnboardingGate）は Suspense の内側に置き、
 * レイアウトの最上位では await しない。外枠（タブ）と各ページの静的な部分は先に表示される。
 */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <OnboardingGate />
      </Suspense>
      <div className="flex-1">{children}</div>
      {/* usePathname は動的なルート（/habits/[id] など）で Suspense の内側に置く必要がある */}
      <Suspense fallback={null}>
        <MainTabBar className="sticky bottom-0" />
      </Suspense>
    </div>
  );
}

/**
 * ログインしていなければログインへ、オンボーディング前（onboarded_at が NULL）なら O5 へ移す。
 * ログイン済みなので、説明の O1〜O3 と A1 は飛ばして「最初の習慣を選ぶ」から始める。
 * 表示するものはない。
 */
async function OnboardingGate() {
  const user = await requireUser();
  if (!(await isOnboarded(user.id))) redirect("/onboarding/start");
  return null;
}
