import { fillTemplate, pickBySeed, type Grumble } from "./grumble";
import type { ReviewItem } from "./review";
import type { Expression, LogicalDate } from "./types";

/**
 * 振り返り（⑥-a）のキャラの一言。domain-spec.md 8章の表は記録画面のもので、
 * 振り返りの条件は決まっていないので、上から順に判定する：
 * 1. 達成していることがある → happy（いちばん上の項目の数字を差し込む）
 * 2. もう少しで達成がある → normal
 * 3. その年に記録がある → normal
 * 4. 記録がない → sleepy
 */
export type ReviewGrumbleScene = "achieving" | "almost" | "recorded" | "empty";

export interface ReviewGrumbleInput {
  achievements: readonly ReviewItem[];
  almostThere: readonly ReviewItem[];
  recordCount: number;
  /** 日替わりでセリフを選ぶための種 */
  today: LogicalDate;
  /** 習慣名の引き当て（セリフへの差し込み用） */
  habitNames: Readonly<Record<string, string>>;
}

const SCENE_EXPRESSION: Record<ReviewGrumbleScene, Expression> = {
  achieving: "happy",
  almost: "normal",
  recorded: "normal",
  empty: "sleepy",
};

/**
 * セリフのデータ。{value}{unit}：項目の数字と単位（27日・3週）、{habit}：その習慣の名前、
 * {count}：その年の記録の件数。
 */
export const REVIEW_GRUMBLE_LINES: Readonly<
  Record<ReviewGrumbleScene, readonly string[]>
> = {
  achieving: [
    "{value}{unit}も続いてるの？ ぼくには無理…。",
    "{value}{unit}連続かぁ。ぼくはずっと寝てた。",
    "えらすぎる…。{habit}のこと、ちょっと尊敬してる。",
  ],
  almost: [
    "もうちょっとで{habit}、達成だね。ぼくは見てるだけ。",
    "あと少しだよ。ぼくのぶんまで、がんばって…。",
    "{habit}、あと{value}{unit}だって。ぼくなら寝ちゃう。",
  ],
  recorded: [
    "草、ちょっとずつ生えてきたね。ぼくは生えない…。",
    "記録{count}件。ぼくは0件。",
    "ゆるくても、続いてるのがえらい。",
  ],
  empty: [
    "まだ何もないね…。ぼくといっしょ。",
    "草、まだ生えてないね。ぼくも寝てた。",
  ],
};

export function reviewGrumbleScene(
  input: Pick<
    ReviewGrumbleInput,
    "achievements" | "almostThere" | "recordCount"
  >,
): ReviewGrumbleScene {
  if (input.achievements.length > 0) return "achieving";
  if (input.almostThere.length > 0) return "almost";
  if (input.recordCount > 0) return "recorded";
  return "empty";
}

/** 振り返りのキャラの一言。同じ日・同じ場面なら同じセリフ */
export function selectReviewGrumble(input: ReviewGrumbleInput): Grumble {
  const scene = reviewGrumbleScene(input);
  const item =
    scene === "achieving"
      ? input.achievements[0]
      : scene === "almost"
        ? input.almostThere[0]
        : undefined;
  const template = pickBySeed(
    REVIEW_GRUMBLE_LINES[scene],
    `review:${scene}:${input.today}`,
  );
  return {
    expression: SCENE_EXPRESSION[scene],
    text: fillTemplate(template, {
      value: item?.figure.value ?? "",
      unit: item?.figure.unit ?? "",
      habit: item ? (input.habitNames[item.habitId] ?? "") : "",
      count: input.recordCount,
    }),
  };
}
