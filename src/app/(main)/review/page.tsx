import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { splitDate } from "@/domain/date";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/services/clock";
import { ServiceError } from "@/server/services/errors";
import { getReviewView } from "@/server/services/review";
import { ReviewScreen } from "./review-screen";

/**
 * ⑥-a 振り返り。URL：/review?year=2024&habit=<習慣のID>
 * habit を付けると「習慣ごと」、付けなければ「すべての習慣」。year を省くと今年。
 * 見出しは先に表示し、セッション・DB を読む部分は Suspense の内側に置く（Cache Components）。
 */
export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <main className="pb-8">
      <ScreenHeader title="Review" subtitle="振り返り" />
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReviewContent({
  searchParams,
}: Pick<PageProps<"/review">, "searchParams">) {
  const params = await searchParams;
  const user = await requireUser();
  const today = await getToday(user.id);
  const [thisYear] = splitDate(today);
  const year = parseYear(first(params.year), thisYear);
  const habitId = first(params.habit) ?? null;

  let view;
  try {
    view = await getReviewView(user.id, year, habitId);
  } catch (error) {
    // 他人の習慣・消した習慣の ID なら「すべての習慣」に戻す
    if (error instanceof ServiceError && error.code === "not_found") {
      redirect(`/review?year=${year}`);
    }
    throw error;
  }
  return <ReviewScreen view={view} />;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** 年の指定を読む。数字でない・今年より先なら今年 */
function parseYear(value: string | undefined, thisYear: number): number {
  if (value === undefined || !/^\d{4}$/.test(value)) return thisYear;
  const year = Number(value);
  return year > thisYear || year < 2000 ? thisYear : year;
}

function ReviewSkeleton() {
  return (
    <div className="px-screen-x mt-4 space-y-4" aria-hidden="true">
      <div className="h-6 w-40 bg-gray-100" />
      <div className="frame h-[140px] bg-white" />
    </div>
  );
}
