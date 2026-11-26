import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/server/auth";
import { ServiceError } from "@/server/services/errors";
import { getCategory } from "@/server/services/memo";
import { idSchema } from "@/server/validation";
import { categoryBackHref } from "../back-href";
import { CategoryForm } from "../category-form";

/**
 * ⑨-c カテゴリの編集（Figma 2167:5592。⑨ の「目標を変える」から）。URL：/memo/categories/<ID>?back=<戻る先>
 * Cache Components のため、params・セッション・DB を読む部分は Suspense の内側に置く。
 */
export default function EditCategoryPage({
  params,
  searchParams,
}: PageProps<"/memo/categories/[id]">) {
  return (
    <Suspense
      fallback={
        <p className="px-screen-x text-body mt-6 text-gray-500">読み込み中…</p>
      }
    >
      <EditCategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditCategoryContent({
  params,
  searchParams,
}: Pick<PageProps<"/memo/categories/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  let category;
  try {
    category = await getCategory(user.id, id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") notFound();
    throw error;
  }
  return (
    <CategoryForm category={category} backHref={categoryBackHref(query.back)} />
  );
}
