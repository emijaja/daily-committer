"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Pill } from "@/components/Pill";
import { HeaderIconButton } from "@/components/ScreenHeader";
import { MascotSpeech } from "@/components/Speech";

/** 記録のしかた（B12）。キャラの口調（docs/design/character.md）で、ゆるく短く */
const TIPS = [
  [
    "□ をタップ",
    "できたら、タップで記録。まちがえたら、もう一度タップで消せるよ。週・月の習慣は、今日の1回として記録するね。",
  ],
  [
    "＋ をタップ",
    "量の習慣（km・ページなど）は、量を入れるシートが開くよ。習慣の名前をタップしても同じ。週・月の回数の習慣は、今日の1回を記録。もう一度タップで取り消し。",
  ],
  [
    "＋ を長押し",
    "量の習慣は、前回と同じ量ですぐに記録するよ。まちがえたら、下に出る「取り消す」で戻せる。",
  ],
  [
    "量のシート",
    "「合計を入力」の習慣は、今日の合計を入れて上書き。「回ごとに足す」の習慣は、1回分ずつ足していくよ。足した記録は、シートの一覧から消せる。",
  ],
  [
    "過去の日を直す",
    "「振り返り」で日付を選ぶと、その日の記録を直せるよ。ぼくは昨日のことなんて、もう覚えてないけど…。",
  ],
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
        <MascotSpeech form="icon" expression="normal">
          記録はかんたんだよ。ぼくでも…たぶんできる。
        </MascotSpeech>
        <dl className="frame mt-4 divide-y divide-black">
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
