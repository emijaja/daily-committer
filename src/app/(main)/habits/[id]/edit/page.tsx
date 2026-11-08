import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { getHabit } from "@/server/services/habits";
import { idSchema } from "@/server/validation";
import { HabitForm } from "../../habit-form";

/**
 * ⑤-b 習慣の編集（screens.md ⑤-b）。
 * Cache Components のため、params・セッション・DB を読む部分は Suspense の内側に置く。
 */
export default function EditHabitPage({
  params,
}: PageProps<"/habits/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <p className="px-screen-x text-body mt-6 text-gray-500">読み込み中…</p>
      }
    >
      <EditHabitContent params={params} />
    </Suspense>
  );
}

async function EditHabitContent({
  params,
}: {
  params: PageProps<"/habits/[id]/edit">["params"];
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const habit = await getHabit(user.id, id);
  if (!habit) notFound();
  return <HabitForm mode="edit" habit={habit} />;
}
