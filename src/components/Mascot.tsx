import type { Expression } from "@/domain/types";
import { cx } from "./cx";
import { MASCOT_VIEWBOX, mascotBody, mascotFaces } from "./mascot-art";

const EXPRESSION_LABEL: Record<Expression, string> = {
  normal: "ふつうの顔",
  grumpy: "ぼやいている顔",
  happy: "よろこんでいる顔",
  sleepy: "ねむそうな顔",
};

/** 丸アイコンで切り抜く範囲（元の SVG の座標）。顔の模様を中心にした正方形 */
const ICON_CROP = { x: 94, y: 58, size: 58 } as const;

export interface MascotProps {
  expression?: Expression;
  /**
   * full: 全身（枝にぶら下がった姿）。幅は size（既定 140）
   * icon: 顔まわりを切り抜いた丸アイコン（黄色地・黒枠 1.5px）。直径は size（既定 44）
   */
  form?: "full" | "icon";
  size?: number;
  /** 全身のとき、後ろに黄色の丸を敷く（既定 true） */
  circle?: boolean;
  /** 読み上げ用。省略すると「ナマケモノ（表情）」。飾りなら "" を渡す */
  label?: string;
  className?: string;
}

/** キャラ（ナマケモノ）。4表情 × 全身／丸アイコン */
export function Mascot({
  expression = "normal",
  form = "full",
  size,
  circle = true,
  label,
  className,
}: MascotProps) {
  const alt = label ?? `ナマケモノ（${EXPRESSION_LABEL[expression]}）`;
  const a11y =
    alt === ""
      ? { "aria-hidden": true as const }
      : { role: "img" as const, "aria-label": alt };
  const art = (
    <>
      {mascotBody}
      {mascotFaces[expression]}
    </>
  );

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
          viewBox={`${ICON_CROP.x} ${ICON_CROP.y} ${ICON_CROP.size} ${ICON_CROP.size}`}
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
