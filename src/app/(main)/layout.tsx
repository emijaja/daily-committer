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
      <MainTabBar className="sticky bottom-0" />
    </div>
  );
}

/**
 * ログインしていなければログインへ、オンボーディング前（onboarded_at が NULL）ならオンボーディングへ移す。
 * 表示するものはない。
 */
async function OnboardingGate() {
  const user = await requireUser();
  if (!(await isOnboarded(user.id))) redirect("/onboarding");
  return null;
}
