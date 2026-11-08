import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { splitDate } from "@/domain/date";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/services/clock";
import { getDayEditView } from "@/server/services/review";
import { logicalDateSchema } from "@/server/validation";
import { DayEditScreen } from "./day-edit-screen";

const SUBTITLE = "記録の確認・修正";

/**
 * ② 記録の確認・修正。URL：/review/2024-10-29
 * - 暦にない日付・形式の違う値は 404。今日より先の日付は今日へ移す
 * - Cache Components のため、params・セッション・DB を読む部分は Suspense の内側に置く
 * - 下部タブは出さない（main-tab-bar.tsx が /review/[date] では表示しない）
 */
export default function DayEditPage({ params }: PageProps<"/review/[date]">) {
  return (
    <main className="pb-8">
      <Suspense fallback={<DayEditSkeleton />}>
        <DayEditContent params={params} />
      </Suspense>
    </main>
  );
}

async function DayEditContent({
  params,
}: {
  params: PageProps<"/review/[date]">["params"];
}) {
  const parsed = logicalDateSchema.safeParse((await params).date);
  if (!parsed.success) notFound();
  const date = parsed.data;
  const user = await requireUser();
  const today = await getToday(user.id);
  if (date > today) redirect(`/review/${today}`);
  const view = await getDayEditView(user.id, date);
  return (
    <>
      <ScreenHeader
        title="Edit"
        subtitle={SUBTITLE}
        back={{ label: "Review", href: `/review?year=${splitDate(date)[0]}` }}
      />
      <DayEditScreen view={view} />
    </>
  );
}

function DayEditSkeleton() {
  return (
    <>
      <ScreenHeader
        title="Edit"
        subtitle={SUBTITLE}
        back={{ label: "Review", href: "/review" }}
      />
      <div className="px-screen-x mt-3 space-y-4" aria-hidden="true">
        <div className="frame h-[72px] bg-white" />
        <div className="h-6 w-40 bg-gray-100" />
        <div className="frame h-[140px] bg-white" />
      </div>
    </>
  );
}
