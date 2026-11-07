import type { PeriodProgress } from "./achievement";
import type { Expression, LogicalDate, Period } from "./types";

/** キャラのぼやき。domain-spec.md 8章 */
export interface Grumble {
  expression: Expression;
  text: string;
}

export interface GrumbleInput {
  /** 記録画面のタブ */
  period: Period;
  progresses: readonly PeriodProgress[];
  /** 0〜23。ユーザーのタイムゾーンでの現在の時 */
  hour: number;
  /** 日替わりでセリフを選ぶための種 */
  today: LogicalDate;
  /** 習慣名の引き当て（セリフへの差し込み用） */
  habitNames: Readonly<Record<string, string>>;
}

/** セリフの場面（domain-spec.md 8章の優先 2〜5） */
export type GrumbleScene = "allDone" | "night" | "nothingYet" | "remaining";

/**
 * セリフのテンプレートに差し込める値。
 * - {habit}：未達成の習慣のうち最初の1つの名前
 * - {left}：未達成の習慣の数
 * - {done} / {total}：達成した数 / 全体の数
 * - {period}：今日・今週・今月
 */
export interface GrumbleValues {
  habit: string;
  left: number;
  done: number;
  total: number;
  period: string;
}

const SCENE_EXPRESSION: Record<GrumbleScene, Expression> = {
  allDone: "happy",
  night: "sleepy",
  nothingYet: "grumpy",
  remaining: "grumpy",
};

/**
 * セリフのデータ。キャラ設定（docs/design/character.md）：ナマケモノ、一人称「ぼく」、
 * ゆるく少し自虐的、責めない。日替わりで1つ選ぶ。
 */
export const GRUMBLE_LINES: Readonly<Record<GrumbleScene, readonly string[]>> =
  {
    allDone: [
      "{total}つともできた！ {period}はもう、ゆっくりしよ。",
      "全部できてる…！ ぼくには、とても無理…。",
      "{period}のぶん、おしまい。ぼくもいっしょに休むね。",
      "えらすぎる…。ぼくはぶら下がってただけなのに。",
      "全部できたね。ごほうびに、のんびりしていいよ。",
    ],
    night: [
      "そろそろ寝る時間だよ…。記録はあと{left}つ。",
      "{habit}はまた明日かぁ…。ぼくはもう眠い…。",
      "夜だね…。あと{left}つ、できたらえらいけど、寝てもいいよ。",
      "ふぁ…。残りは明日のぼくたちに任せよ…。",
    ],
    nothingYet: [
      "まだ0個…ぼくと同じだね。",
      "{period}はまだ何もしてないの？ ぼくもだよ。",
      "0 / {total}…。なかま、なかま。",
      "{habit}、ちょっとだけやってみる？ ぼくは見てる。",
      "なんにもしない{period}も、わるくないけど…。",
    ],
    remaining: [
      "{habit}、まだかぁ…。でも記録してるの、えらい。",
      "あと{left}つ…。ぼくなら、もうあきらめてるよ。",
      "{done} / {total}。ぼくから見たら、もう十分すごい。",
      "{habit}は後でまとめてやる気でしょ。知ってるよ。",
      "あと{left}つだね。ぼくは、ここでぶら下がって待ってる。",
    ],
  };

const PERIOD_LABEL: Record<Period, string> = {
  daily: "今日",
  weekly: "今週",
  monthly: "今月",
};

/** 夜とみなす時刻：22時以降と、日付が切り替わる前の深夜（0〜3時） */
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 4;

/** 文字列から決まる 32bit のハッシュ（FNV-1a）。日替わりの選択に使う */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * seed から決まる1つを選ぶ。同じ seed なら同じ要素（日替わりの選択に使う）。
 * items が空なら例外。
 */
export function pickBySeed<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) throw new Error("pickBySeed: items is empty");
  return items[hash(seed) % items.length] as T;
}

/** テンプレートの {key} を values の値に置き換える。知らない key はそのまま残す */
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * セリフの場面を決める。domain-spec.md 8章の表を上から判定する。
 * その期間の習慣が0件なら null。
 */
export function grumbleScene(
  input: Pick<GrumbleInput, "period" | "progresses" | "hour">,
): GrumbleScene | null {
  const { period, progresses, hour } = input;
  if (progresses.length === 0) return null;
  if (progresses.every((p) => p.achieved)) return "allDone";
  const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  if (period === "daily" && isNight) return "night";
  if (progresses.every((p) => p.recordedDates.length === 0)) {
    return "nothingYet";
  }
  return "remaining";
}

/**
 * 記録画面のキャラのぼやきを選ぶ。domain-spec.md 8章。
 * 1. その期間の習慣が0件 → null（空の状態 E1／E2 を出す）
 * 2. すべて達成 → happy
 * 3. 今日タブで 22時以降（と 0〜3時）、未達成が残っている → sleepy
 * 4. まだ何も記録していない → grumpy
 * 5. 未達成が残っている → grumpy
 * セリフは場面ごとの候補から、today・タブ・場面で日替わりに決定的に選ぶ。
 */
export function selectGrumble(input: GrumbleInput): Grumble | null {
  const scene = grumbleScene(input);
  if (scene === null) return null;

  const { progresses, habitNames, period, today } = input;
  const pending = progresses.filter((p) => !p.achieved);
  const done = progresses.length - pending.length;
  const focus = pending[0] ?? progresses[0];
  const values: GrumbleValues = {
    habit: (focus && habitNames[focus.habitId]) ?? "習慣",
    left: pending.length,
    done,
    total: progresses.length,
    period: PERIOD_LABEL[period],
  };
  const template = pickBySeed(
    GRUMBLE_LINES[scene],
    `${today}:${period}:${scene}`,
  );
  return {
    expression: SCENE_EXPRESSION[scene],
    text: fillTemplate(template, { ...values }),
  };
}
