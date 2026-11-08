"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Marker } from "@/components/Marker";
import { Pill } from "@/components/Pill";
import { PresetChips, usePresetSelection } from "@/components/PresetChips";
import { MascotSpeech } from "@/components/Speech";
import { Toast } from "@/components/Toast";
import { HABIT_PRESETS, presetCountLabel } from "@/domain/presets";
import { createHabitsFromPresetsAction } from "@/server/actions/habits";

/**
 * おすすめから選ぶ画面の本体。O5 と同じく初期はすべて未選択で、「毎日・チェックのみ」でまとめて登録する。
 * 同じ名前の現在の習慣があるおすすめは「登録済み」（チェック付きの灰色）にして選べなくする。
 * 登録したら ④ 習慣の一覧へ戻る。
 */
export function PresetsScreen({ registered }: { registered: string[] }) {
  const router = useRouter();
  const { items, selected, toggle } = usePresetSelection(registered);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const count = selected.length;
  const allRegistered = items.every((i) => i.registered);
  const registeredCount = items.filter((i) => i.registered).length;

  const submit = () => {
    if (count === 0) return;
    startTransition(async () => {
      const result = await createHabitsFromPresetsAction({ names: selected });
      if (!result.ok) {
        setToast((prev) => ({
          key: (prev?.key ?? 0) + 1,
          message: result.error,
        }));
        return;
      }
      router.push("/habits");
    });
  };

  return (
    <div className="px-screen-x flex flex-1 flex-col">
      <p className="text-body mt-3 text-gray-600">
        選んだ習慣を「毎日・チェックのみ」でまとめて追加します。あとから編集できます。
      </p>

      <PresetChips
        className="mt-4"
        items={items}
        onToggle={toggle}
        disabled={pending}
        custom={{ href: "/habits/new" }}
      />
      {registeredCount > 0 ? (
        <p className="text-caption mt-3 text-gray-500">
          灰色のものは、もう登録してある習慣です（{registeredCount} /{" "}
          {HABIT_PRESETS.length}）
        </p>
      ) : null}

      <div className="flex flex-1 flex-col justify-end pt-8">
        <MascotSpeech expression="normal" className="pr-6">
          {allRegistered
            ? "おすすめは、ぜんぶ登録済み。\nぼくより働き者だね。"
            : "気になるものだけで\nいいよ。\nぼくは見てるだけ。"}
        </MascotSpeech>
        <p className="mt-4 text-[11px] leading-[17px]" aria-live="polite">
          <Marker className="px-1.5">
            {`選択中 ${presetCountLabel(count)} ・ 「毎日・チェックのみ」で登録します`}
          </Marker>
        </p>
      </div>

      <div className="mt-5">
        <Pill disabled={pending || count === 0} onClick={submit}>
          {count === 0 ? "習慣を選んでください" : `この${count}つを追加`}
        </Pill>
      </div>

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
