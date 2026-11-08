import type { ReactNode } from "react";
import type { Expression } from "@/domain/types";
import { cx } from "./cx";
import { Mascot } from "./Mascot";

export interface SpeechProps {
  /** セリフ（domain の Grumble.text など） */
  children: ReactNode;
  /** 下の小さなメタ情報（例：21:04 ・ 今日の残り 1） */
  meta?: ReactNode;
  /** lg: 記録画面の吹き出し（12px）／sm: 丸アイコンの横の一言（11px） */
  size?: "lg" | "sm";
  className?: string;
}

/** 吹き出し：白・黒枠 1.5px の四角、太字 */
export function Speech({
  children,
  meta,
  size = "lg",
  className,
}: SpeechProps) {
  return (
    <div
      className={cx(
        "frame bg-white",
        size === "lg" ? "px-[13.5px] pt-[11.5px] pb-[11px]" : "px-3 py-[7px]",
        className,
      )}
    >
      <p
        className={cx(
          // セリフの中の改行（\n）はそのまま改行にする
          "font-bold whitespace-pre-line",
          size === "lg"
            ? "text-[12px] leading-[19px]"
            : "text-[11px] leading-4",
        )}
      >
        {children}
      </p>
      {meta ? (
        <p className="mt-1.5 text-[9px] leading-[11px] font-medium text-gray-500">
          {meta}
        </p>
      ) : null}
    </div>
  );
}

export interface MascotSpeechProps {
  expression: Expression;
  children: SpeechProps["children"];
  meta?: ReactNode;
  /**
   * full: 記録画面のヘッダー下（全身 140＋右に吹き出し）
   * icon: 振り返り・詳細・設定などの一言（丸アイコン 44＋吹き出し）
   */
  form?: "full" | "icon";
  className?: string;
}

/** キャラと吹き出しを横に並べたもの */
export function MascotSpeech({
  expression,
  children,
  meta,
  form = "full",
  className,
}: MascotSpeechProps) {
  if (form === "icon") {
    return (
      <div className={cx("flex items-center gap-2", className)}>
        <Mascot expression={expression} form="icon" label="" />
        <Speech size="sm" meta={meta} className="min-w-0 flex-1">
          {children}
        </Speech>
      </div>
    );
  }
  return (
    <div className={cx("flex items-center gap-1", className)}>
      <Mascot expression={expression} label="" />
      <Speech meta={meta} className="min-w-0 flex-1">
        {children}
      </Speech>
    </div>
  );
}
