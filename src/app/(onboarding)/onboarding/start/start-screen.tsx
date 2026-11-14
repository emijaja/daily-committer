"use client";

import { useRouter } from "next/navigation";
import { Pill } from "@/components/Pill";
import { PresetChips } from "@/components/PresetChips";
import {
  PresetCountNote,
  PresetSubmitToast,
  usePresetSubmit,
} from "@/components/PresetSubmit";
import { MascotSpeech } from "@/components/Speech";
import { startWithPresetsAction } from "@/server/actions/settings";
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
  const { items, toggle, count, pending, submit, toast } =
    usePresetSubmit(registered);

  const decide = (mode: keyof typeof NEXT_HREF) =>
    submit(
      (names) =>
        startWithPresetsAction({
          // 作った日・記録の日付をこの端末の暦に合わせるため、タイムゾーンも送る
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          names,
        }),
      () => router.push(NEXT_HREF[mode]),
    );

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
        custom={{ onPress: () => decide("custom") }}
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
        <PresetCountNote count={count}>
          {count === 0
            ? "あとから「習慣」タブで追加できます"
            : "「毎日・チェックのみ」で登録します"}
        </PresetCountNote>
      </div>

      <PageDots current={ONBOARDING_STEP.o5} />
      <div className="mt-4">
        {count === 0 ? (
          <Pill
            variant="secondary"
            disabled={pending}
            onClick={() => decide("decide")}
          >
            選ばずにはじめる
          </Pill>
        ) : (
          <Pill disabled={pending} onClick={() => decide("decide")}>
            この{count}つで決定
          </Pill>
        )}
      </div>

      <PresetSubmitToast {...toast} />
    </main>
  );
}
