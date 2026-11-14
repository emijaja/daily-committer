import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { isOnboarded } from "@/server/services/settings";

/**
 * 入口。表示するものはなく、状態で行き先を決める。
 * - ログインしていない → O1（/onboarding）。cookie が無い場合は proxy.ts が先に移す
 * - ログイン済みでオンボーディングを終えていない → O5（/onboarding/start）
 * - 終えている → ①-a（/record/today）
 * Cache Components のため、セッションを読む部分は Suspense の内側に置く。
 */
export default function Home() {
  return (
    <Suspense fallback={null}>
      <Entrance />
    </Suspense>
  );
}

async function Entrance() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");
  return redirect(
    (await isOnboarded(user.id)) ? "/record/today" : "/onboarding/start",
  );
}
