import type { Expression } from "@/domain/types";
import { cx } from "./cx";
import {
  KOMAINU_ICON_CROP,
  komainuBody,
  komainuFaces,
  type KomainuExpression,
} from "./komainu-art";
import { MASCOT_VIEWBOX, mascotBody, mascotFaces } from "./mascot-art";

/**
 * どのキャラか（docs/design/character.md）。
 * sloth: ナマケモノ（記録・習慣などのぼやく相棒）／komainu: 狛犬（メモの聞く相棒）
 */
export type Character = "sloth" | "komainu";

const CHARACTER_NAME: Record<Character, string> = {
  sloth: "ナマケモノ",
  komainu: "狛犬",
};

const EXPRESSION_LABEL: Record<Expression, string> = {
  normal: "ふつうの顔",
  grumpy: "ぼやいている顔",
  happy: "よろこんでいる顔",
  sleepy: "ねむそうな顔",
};

/** 丸アイコンで切り抜く範囲（元の SVG の座標）。ナマケモノは顔の模様を中心にした正方形 */
const ICON_CROP: Record<Character, { x: number; y: number; size: number }> = {
  sloth: { x: 94, y: 58, size: 58 },
  komainu: KOMAINU_ICON_CROP,
};

/** 狛犬には grumpy（ぼやき）がないので、normal（吽）で描く */
export function komainuExpression(expression: Expression): KomainuExpression {
  return expression === "grumpy" ? "normal" : expression;
}

function artOf(character: Character, expression: Expression) {
  if (character === "komainu") {
    return (
      <>
        {komainuBody}
        {komainuFaces[komainuExpression(expression)]}
      </>
    );
  }
  return (
    <>
      {mascotBody}
      {mascotFaces[expression]}
    </>
  );
}

export interface MascotProps {
  /** どのキャラか（既定 sloth） */
  character?: Character;
  /** 狛犬に grumpy を渡すと normal で描く */
  expression?: Expression;
  /**
   * full: 全身（ナマケモノは枝にぶら下がった姿、狛犬は台座に座った姿）。幅は size（既定 140）
   * icon: 顔まわりを切り抜いた丸アイコン（黄色地・黒枠 1.5px）。直径は size（既定 44）。
   *       狛犬は耳まで入るよう頭全体を切り抜く
   */
  form?: "full" | "icon";
  size?: number;
  /** 全身のとき、後ろに黄色の丸を敷く（既定 true） */
  circle?: boolean;
  /** 読み上げ用。省略すると「ナマケモノ（表情）」「狛犬（表情）」。飾りなら "" を渡す */
  label?: string;
  className?: string;
}

/** キャラ（ナマケモノ・狛犬）。表情 × 全身／丸アイコン */
export function Mascot({
  character = "sloth",
  expression = "normal",
  form = "full",
  size,
  circle = true,
  label,
  className,
}: MascotProps) {
  const shown: Expression =
    character === "komainu" ? komainuExpression(expression) : expression;
  const alt =
    label ?? `${CHARACTER_NAME[character]}（${EXPRESSION_LABEL[shown]}）`;
  const a11y =
    alt === ""
      ? { "aria-hidden": true as const }
      : { role: "img" as const, "aria-label": alt };
  const art = artOf(character, expression);
  const crop = ICON_CROP[character];

  if (form === "icon") {
    const d = size ?? 44;
    return (
      <span
        {...a11y}
        className={cx(
          "frame bg-yellow inline-flex shrink-0 overflow-hidden rounded-full text-black",
          className,
        )}
        style={{ width: d, height: d }}
      >
        <svg
          viewBox={`${crop.x} ${crop.y} ${crop.size} ${crop.size}`}
          className="size-full"
          fill="none"
          aria-hidden="true"
        >
          {art}
        </svg>
      </span>
    );
  }

  // 全身：Figma の「mascot」フレーム（幅 140・高さ 123.5、丸は幅の 82%）の比率に合わせる
  const w = size ?? 140;
  const h = (w * 123.5) / 140;
  return (
    <span
      {...a11y}
      className={cx("relative inline-block shrink-0 text-black", className)}
      style={{ width: w, height: h }}
    >
      {circle ? (
        <span
          aria-hidden="true"
          className="bg-yellow absolute rounded-full"
          style={{
            width: w * 0.82,
            height: w * 0.82,
            left: w * 0.0757,
            top: w * 0.0479,
          }}
        />
      ) : null}
      <svg
        viewBox={`0 0 ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}`}
        className="absolute left-0"
        style={{ top: w * 0.0143, width: w, height: (w * 140) / 164 }}
        fill="none"
        aria-hidden="true"
      >
        {art}
      </svg>
    </span>
  );
}
