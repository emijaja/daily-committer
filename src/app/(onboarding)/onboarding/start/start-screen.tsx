"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Marker } from "@/components/Marker";
import { Pill } from "@/components/Pill";
import { PresetChips, usePresetSelection } from "@/components/PresetChips";
import { MascotSpeech } from "@/components/Speech";
import { Toast } from "@/components/Toast";
import { presetCountLabel } from "@/domain/presets";
import { createHabitsFromPresetsAction } from "@/server/actions/habits";
import { updateSettingsAction } from "@/server/actions/settings";
import { ONBOARDING_STEP, OnboardingText, PageDots } from "../onboarding-ui";

/** O4 へ。「自分で作る」から来たときは、O4 のあと ⑤-a を開く */
const NEXT_HREF = {
  decide: "/onboarding/grumble",
  custom: "/onboarding/grumble?next=new",
} as const;

/**
 * O5 の本体。チップは初期状態ですべて未選択。
 * 決定すると「毎日・チェックのみ」でまとめて登録し、O4 へ進む（0件なら登録せずに O4 へ）。
 * 「＋ 自分で作る」は、選んだものを同じように登録してから O4 へ進み、O4 のあと ⑤-a を開く。
 */
export function StartScreen({ registered }: { registered: string[] }) {
  const router = useRouter();
  const { items, selected, toggle } = usePresetSelection(registered);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const count = selected.length;

  const submit = (mode: keyof typeof NEXT_HREF) => {
    startTransition(async () => {
      // 作った日・記録の日付をこの端末の暦に合わせるため、先にタイムゾーンを保存する
      // （ログインの時点では既定値のまま。src/server/auth.ts）。失敗しても先へ進む
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        const saved = await updateSettingsAction({ timezone });
        if (!saved.ok) console.error("タイムゾーンを保存できませんでした");
      }
      if (count > 0) {
        const result = await createHabitsFromPresetsAction({ names: selected });
        if (!result.ok) {
          setToast((prev) => ({
            key: (prev?.key ?? 0) + 1,
            message: result.error,
          }));
          return;
        }
      }
      router.push(NEXT_HREF[mode]);
    });
  };

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-5 pb-8">
      <OnboardingText title="Start." heading="最初の習慣を選ぼう">
        あとから変更・追加できます。
      </OnboardingText>

      <PresetChips
        className="mt-4"
        items={items}
        onToggle={toggle}
        disabled={pending}
        custom={{ onPress: () => submit("custom") }}
      />

      <div className="flex flex-1 flex-col justify-end pt-8">
        {count === 0 ? (
          <MascotSpeech expression="normal" className="pr-6">
            {"0個でもいいよ。\nぼくもそう。"}
          </MascotSpeech>
        ) : (
          <MascotSpeech expression="normal" className="pr-6">
            {"3つくらいが\nちょうどいいよ。\nぼくは0個だけど。"}
          </MascotSpeech>
        )}
        <p className="mt-4 text-[11px] leading-[17px]" aria-live="polite">
          <Marker className="px-1.5">
            選択中 {presetCountLabel(count)} ・{" "}
            {count === 0
              ? "あとから「習慣」タブで追加できます"
              : "「毎日・チェックのみ」で登録します"}
          </Marker>
        </p>
      </div>

      <PageDots current={ONBOARDING_STEP.o5} />
      <div className="mt-4">
        {count === 0 ? (
          <Pill
            variant="secondary"
            disabled={pending}
            onClick={() => submit("decide")}
          >
            選ばずにはじめる
          </Pill>
        ) : (
          <Pill disabled={pending} onClick={() => submit("decide")}>
            この{count}つで決定
          </Pill>
        )}
      </div>

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </main>
  );
}
