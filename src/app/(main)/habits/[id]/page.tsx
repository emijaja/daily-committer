import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { getHabitDetail } from "@/server/services/review";
import { idSchema } from "@/server/validation";
import { HabitDetailScreen } from "./habit-detail-screen";

/**
 * ③ 習慣の詳細（screens.md ③）。過去の習慣も表示する。他人の習慣・不正な ID は 404。
 * 見出しにも習慣の名前を出すので、params・セッション・DB を読む部分ごと Suspense の内側に置く（Cache Components）。
 */
export default function HabitDetailPage({ params }: PageProps<"/habits/[id]">) {
  return (
    <main className="pb-8">
      <Suspense fallback={<HabitDetailSkeleton />}>
        <HabitDetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function HabitDetailContent({
  params,
}: {
  params: PageProps<"/habits/[id]">["params"];
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const view = await getHabitDetail(user.id, id);
  if (!view) notFound();
  return <HabitDetailScreen view={view} />;
}

function HabitDetailSkeleton() {
  return (
    <div className="px-screen-x space-y-4 pt-2.5" aria-hidden="true">
      <div className="h-4 w-16 bg-gray-100" />
      <div className="h-10 w-48 bg-gray-100" />
      <div className="h-16 w-32 bg-gray-100" />
      <div className="frame h-[140px] bg-white" />
    </div>
  );
}
