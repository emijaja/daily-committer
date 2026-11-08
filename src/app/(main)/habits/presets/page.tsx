import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireUser } from "@/server/auth";
import { getHabitList } from "@/server/services/habits";
import { PresetsScreen } from "./presets-screen";

/**
 * おすすめから選ぶ（open-questions.md B14）。O5 の選ぶ UI（PresetChips）を再利用する。
 * ④ の「おすすめから選ぶ」と E1（記録画面）から開く。Figma にフレームはなく、O5 と ⑤ に合わせた。
 * 下部タブは出さない（⑤ と同じく習慣を追加する途中の画面のため。main-tab-bar.tsx）。
 */
export default function HabitPresetsPage() {
  return (
    <main className="flex min-h-dvh flex-col pb-8">
      <ScreenHeader
        title="Presets"
        subtitle="おすすめから選ぶ"
        back={{ label: "Habits", href: "/habits" }}
      />
      <Suspense
        fallback={
          <p className="px-screen-x text-body mt-6 text-gray-500">
            読み込み中…
          </p>
        }
      >
        <PresetsContent />
      </Suspense>
    </main>
  );
}

async function PresetsContent() {
  const user = await requireUser();
  const list = await getHabitList(user.id, "active");
  const registered = list.groups.flatMap((g) => g.habits.map((h) => h.name));
  return <PresetsScreen registered={registered} />;
}
