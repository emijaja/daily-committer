import { Suspense } from "react";
import { HeaderIconLink, ScreenHeader } from "@/components/ScreenHeader";
import type { Period } from "@/domain/types";
import { requireUser } from "@/server/auth";
import { getRecordView } from "@/server/services/record";
import { getSettings } from "@/server/services/settings";
import { HelpButton } from "./help-button";
import { RecordScreen } from "./record-screen";

const HEADINGS: Record<Period, { title: string; subtitle: string }> = {
  daily: { title: "Today", subtitle: "今日の習慣を記録" },
  weekly: { title: "Week", subtitle: "今週の習慣を記録" },
  monthly: { title: "Month", subtitle: "今月の習慣を記録" },
};

/**
 * ①-a/b/c 記録の画面の共通部分。
 * 見出しは静的に先に出し、セッションと DB を読む部分は Suspense の内側に置く（Cache Components）。
 */
export function RecordPage({ period }: { period: Period }) {
  const { title, subtitle } = HEADINGS[period];
  return (
    <main className="pb-8">
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <HelpButton />
            <HeaderIconLink icon="settings" label="設定" href="/settings" />
          </>
        }
      />
      <Suspense
        fallback={
          <p className="px-screen-x text-body mt-6 text-gray-500">
            読み込み中…
          </p>
        }
      >
        <RecordContent period={period} />
      </Suspense>
    </main>
  );
}

async function RecordContent({ period }: { period: Period }) {
  const user = await requireUser();
  const now = new Date();
  const [view, settings] = await Promise.all([
    getRecordView(user.id, period, now),
    getSettings(user.id),
  ]);
  // 吹き出しの下の「21:04」。ユーザーのタイムゾーンの時刻
  const clock = new Intl.DateTimeFormat("ja-JP", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return <RecordScreen view={view} clock={clock} />;
}
