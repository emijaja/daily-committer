import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { ServiceError } from "@/server/services/errors";
import { getMemoWriteView } from "@/server/services/memo";
import { idSchema } from "@/server/validation";
import { MemoEditor } from "../../memo-editor";
import { monthHref } from "../../memo-format";

/**
 * メモの編集（⑨-e の「編集する」から）。⑨-b と同じ画面で、上のボタンが「保存」になる。
 * 本文を空にして保存すると消える。保存・キャンセルのあとは、そのメモの月の一覧（⑨-d）に戻る。
 * Cache Components のため、params・セッション・DB を読む部分は Suspense の内側に置く。
 */
export default function EditMemoPage({ params }: PageProps<"/memo/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <p className="px-screen-x text-body mt-6 text-gray-500">読み込み中…</p>
      }
    >
      <EditMemoContent params={params} />
    </Suspense>
  );
}

async function EditMemoContent({
  params,
}: {
  params: PageProps<"/memo/[id]/edit">["params"];
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  let view;
  try {
    view = await getMemoWriteView(user.id, { memoId: id });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") notFound();
    throw error;
  }
  return <MemoEditor view={view} backHref={monthHref(view.initial.date)} />;
}
