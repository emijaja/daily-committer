import { Mascot } from "@/components/Mascot";
import { MascotSpeech, Speech } from "@/components/Speech";
import type { Expression } from "@/domain/types";
import { CatalogSection, Sample } from "./catalog-ui";

const EXPRESSIONS: readonly Expression[] = [
  "normal",
  "grumpy",
  "happy",
  "sleepy",
];

export function CharacterSection() {
  return (
    <>
      <CatalogSection id="mascot" title="Mascot" figma="2095:5161">
        <Sample label="全身（幅 140・黄色の丸つき）normal / grumpy / happy / sleepy">
          <div className="grid grid-cols-2 gap-3">
            {EXPRESSIONS.map((e) => (
              <div key={e} className="text-caption text-gray-500">
                <Mascot expression={e} />
                <div>{e}</div>
              </div>
            ))}
          </div>
        </Sample>
        <Sample label="全身・丸なし（幅 80）">
          <div className="flex gap-2">
            {EXPRESSIONS.map((e) => (
              <Mascot key={e} expression={e} size={80} circle={false} />
            ))}
          </div>
        </Sample>
        <Sample label="全身・大きい（幅 240、オンボーディング・空の状態）">
          <div className="flex justify-center">
            <Mascot expression="normal" size={240} />
          </div>
        </Sample>
        <Sample label="丸アイコン（44px）／ 小さい（32px）">
          <div className="flex flex-wrap items-center gap-3">
            {EXPRESSIONS.map((e) => (
              <Mascot key={e} expression={e} form="icon" />
            ))}
            {EXPRESSIONS.map((e) => (
              <Mascot key={`s-${e}`} expression={e} form="icon" size={32} />
            ))}
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection id="speech" title="Speech" figma="2098:5166 / 2098:5251">
        <Sample label="吹き出し（lg・メタつき）">
          <Speech meta="21:04 ・ 今日の残り 1">
            早起きはまた明日かぁ…。
            <br />
            でも読書と筋トレはえらい。
          </Speech>
        </Sample>
        <Sample label="吹き出し（sm）">
          <Speech size="sm">27日も続いてるの？ ぼくには無理…。</Speech>
        </Sample>
        <Sample label="MascotSpeech：記録画面（全身＋吹き出し）">
          <MascotSpeech expression="grumpy" meta="21:04 ・ 今日の残り 1">
            {"早起きはまた明日かぁ…。\nでも読書と筋トレはえらい。"}
          </MascotSpeech>
        </Sample>
        <Sample label="MascotSpeech：長いセリフ（3行）">
          <MascotSpeech expression="grumpy" meta="金曜 ・ 今週の残り 2日">
            ランニングあと3.8km…。週末にまとめて走る気でしょ。
          </MascotSpeech>
        </Sample>
        <Sample label="MascotSpeech：全部できた（happy）">
          <MascotSpeech expression="happy" meta="21:04 ・ 今日の残り 0">
            3つともできた！ 今日はもう、ゆっくりしよ。
          </MascotSpeech>
        </Sample>
        <Sample label="MascotSpeech：丸アイコン（振り返り・詳細・設定）">
          <div className="space-y-3">
            <MascotSpeech expression="happy" form="icon">
              27日も続いてるの？ ぼくには無理…。
            </MascotSpeech>
            <MascotSpeech expression="sleepy" form="icon">
              設定はほどほどにね。ぼくはもう寝る…。
            </MascotSpeech>
            <MascotSpeech expression="normal" form="icon">
              新しい習慣…？ がんばってね。ぼくは見てる。
            </MascotSpeech>
          </div>
        </Sample>
      </CatalogSection>
    </>
  );
}
