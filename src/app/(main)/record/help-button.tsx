"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Pill } from "@/components/Pill";
import { HeaderIconButton } from "@/components/ScreenHeader";

const TIPS = [
  ["□ をタップ", "できたら記録。もう一度タップで取り消せます。"],
  [
    "＋ をタップ",
    "量の習慣は、入力のシートが開きます。行の名前をタップしても開きます。",
  ],
  [
    "＋ を長押し",
    "前回と同じ量ですぐに記録します。まちがえたら、トーストの「取り消す」で戻せます。",
  ],
  ["過去の日を直す", "「振り返り」で日付を選ぶと、その日の記録を直せます。"],
] as const;

/** ①の右上の ？。記録のしかたを短く説明するシートを開く */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <HeaderIconButton
        icon="help"
        label="記録のしかた"
        onClick={() => setOpen(true)}
      />
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Help"
        subtitle="記録のしかた"
      >
        <dl className="frame divide-y divide-black">
          {TIPS.map(([term, desc]) => (
            <div key={term} className="px-row-x py-3">
              <dt className="text-row-title">{term}</dt>
              <dd className="text-body mt-1 text-gray-600">{desc}</dd>
            </div>
          ))}
        </dl>
        <Pill className="mt-6" onClick={() => setOpen(false)}>
          とじる
        </Pill>
      </BottomSheet>
    </>
  );
}
