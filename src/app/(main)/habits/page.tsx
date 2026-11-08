import { Suspense } from "react";
import { HeaderIconLink, ScreenHeader } from "@/components/ScreenHeader";
import { requireUser } from "@/server/auth";
import { getHabitList } from "@/server/services/habits";
import { HabitListScreen } from "./habit-list-screen";

/**
 * ④ 習慣の一覧（screens.md ④）。
 * 上部タブは URL の ?tab=archived で切り替える（リンクなので戻る操作でも戻れる）。
 * Cache Components のため、セッション・DB・searchParams を読む部分は Suspense の内側に置く。
 */
export default function HabitsPage({ searchParams }: PageProps<"/habits">) {
  return (
    <main className="pb-8">
      <ScreenHeader
        title="Habits"
        subtitle="習慣の一覧"
        actions={
          <HeaderIconLink icon="plus" label="習慣を追加" href="/habits/new" />
        }
      />
      <Suspense
        fallback={
          <p className="px-screen-x text-body mt-6 text-gray-500">
            読み込み中…
          </p>
        }
      >
        <HabitsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HabitsContent({
  searchParams,
}: {
  searchParams: PageProps<"/habits">["searchParams"];
}) {
  const { tab } = await searchParams;
  const status = tab === "archived" ? "archived" : "active";
  const user = await requireUser();
  const view = await getHabitList(user.id, status);
  return <HabitListScreen view={view} />;
}
