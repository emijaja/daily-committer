import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireUser } from "@/server/auth";
import { getMemoListView } from "@/server/services/memo";
import { MemoListScreen } from "./memo-list-screen";

/**
 * ⑨-d すべてのメモ（Figma 2178:5696）。URL：/memo/all?month=YYYY-MM&category=<ID>
 * month を省くと今月、category を省くと「すべて」。今月より先・他人のカテゴリは無視する。
 * 見出しは静的に先に出し、セッションと DB を読む部分は Suspense の内側に置く（Cache Components）。
 */
export default function AllMemosPage({ searchParams }: PageProps<"/memo/all">) {
  return (
    <main className="flex-1">
      <ScreenHeader
        title="All Memos"
        subtitle="すべてのメモ"
        back={{ label: "Memo", href: "/memo" }}
      />
      <Suspense
        fallback={
          <p className="px-screen-x text-body mt-6 text-gray-500">
            読み込み中…
          </p>
        }
      >
        <AllMemosContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AllMemosContent({
  searchParams,
}: Pick<PageProps<"/memo/all">, "searchParams">) {
  const params = await searchParams;
  const user = await requireUser();
  const view = await getMemoListView(user.id, {
    month: first(params.month),
    categoryId: first(params.category),
  });
  return <MemoListScreen view={view} />;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
