import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { getMemoWriteView } from "@/server/services/memo";
import { logicalDateSchema } from "@/server/validation";
import { MemoEditor } from "../memo-editor";

/**
 * ⑨-b 書く（Figma 2165:5524）。URL：/memo/new?category=<ID>&date=YYYY-MM-DD&draft=1
 * - category・date で選んでおく（省略ならお題のカテゴリ・今日。未来の日付は今日）
 * - draft=1 なら書きかけのメモ（下書き）の続きを書く
 * 下部タブは出さない（main-tab-bar.tsx）。
 */
export default function NewMemoPage({ searchParams }: PageProps<"/memo/new">) {
  return (
    <Suspense
      fallback={
        <p className="px-screen-x text-body mt-6 text-gray-500">読み込み中…</p>
      }
    >
      <NewMemoContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewMemoContent({
  searchParams,
}: Pick<PageProps<"/memo/new">, "searchParams">) {
  const params = await searchParams;
  const user = await requireUser();
  const date = logicalDateSchema.safeParse(first(params.date));
  const view = await getMemoWriteView(user.id, {
    categoryId: first(params.category),
    date: date.success ? date.data : undefined,
    draft: first(params.draft) === "1",
  });
  // 下書きと書きかけを切り替えたときに入力を作り直す
  return (
    <MemoEditor
      key={`${view.fromDraft}-${view.initial.date}-${view.initial.categoryId}`}
      view={view}
      backHref="/memo"
    />
  );
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
