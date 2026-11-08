import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { getHabitList } from "@/server/services/habits";
import { isOnboarded } from "@/server/services/settings";
import { StartScreen } from "./start-screen";

/**
 * O5 最初の習慣を選ぶ（Figma 2105:5679・0件 2134:5489）。ログインが必要（proxy.ts と requireUser）。
 * オンボーディングを終えたユーザーは ①-a へ移す（おすすめは ④ の「おすすめから選ぶ」から）。
 * Cache Components のため、セッションと DB を読む部分は Suspense の内側に置く。
 */
export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartContent />
    </Suspense>
  );
}

async function StartContent() {
  const user = await requireUser();
  if (await isOnboarded(user.id)) redirect("/record/today");
  const list = await getHabitList(user.id, "active");
  const registered = list.groups.flatMap((g) => g.habits.map((h) => h.name));
  return <StartScreen registered={registered} />;
}
