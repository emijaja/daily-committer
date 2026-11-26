import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireUser } from "@/server/auth";
import { getMemoHomeView } from "@/server/services/memo";
import { MemoHome } from "./memo-home";

/**
 * ⑨ メモ：書く（Figma 2163:5504）。下部タブの「書く」。
 * 見出しは静的に先に出し、セッションと DB を読む部分は Suspense の内側に置く（Cache Components）。
 */
export default function MemoPage() {
  return (
    <main className="flex-1">
      <ScreenHeader title="Memo" subtitle="メモを書く" />
      <Suspense
        fallback={
          <p className="px-screen-x text-body mt-6 text-gray-500">
            読み込み中…
          </p>
        }
      >
        <MemoContent />
      </Suspense>
    </main>
  );
}

async function MemoContent() {
  const user = await requireUser();
  const view = await getMemoHomeView(user.id);
  return <MemoHome view={view} />;
}
