import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { categoryBackHref } from "../back-href";
import { CategoryForm } from "../category-form";

/**
 * ⑨-c カテゴリの追加（⑨ の今日のメモの＋、⑨-b のカテゴリの＋から）。URL：/memo/categories/new?back=<戻る先>
 * 下部タブは出さない（main-tab-bar.tsx）。
 */
export default function NewCategoryPage({
  searchParams,
}: PageProps<"/memo/categories/new">) {
  return (
    <Suspense
      fallback={
        <p className="px-screen-x text-body mt-6 text-gray-500">読み込み中…</p>
      }
    >
      <NewCategoryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewCategoryContent({
  searchParams,
}: Pick<PageProps<"/memo/categories/new">, "searchParams">) {
  const params = await searchParams;
  await requireUser();
  return (
    <CategoryForm category={null} backHref={categoryBackHref(params.back)} />
  );
}
