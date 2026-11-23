/**
 * ぼやき・メモ（⑨。docs/web/domain-spec.md 2章 memos・memo_categories・memo_drafts）。
 * I/O なしの純粋関数。
 */
import { addDays, daysInMonth, makeLogicalDate, splitDate } from "./date";
import type { Expression, LogicalDate } from "./types";

export interface MemoCategory {
  id: string;
  name: string;
  /** キャラのお題。null なら既定の文（defaultPrompt） */
  prompt: string | null;
  /** 1日に書く数の目標。null なら目標なし */
  dailyTarget: number | null;
  sortOrder: number;
}

export interface Memo {
  id: string;
  date: LogicalDate;
  body: string;
  categoryId: string | null;
  /** 習慣へのひとこと（⑩）のとき、その習慣 */
  habitId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * はじめてメモの画面を開いたときに作るカテゴリ（domain-spec.md 2章 memo_categories）。
 * よかったこと・ぼやきも特別扱いせず、ふつうの行として作る。
 */
export const DEFAULT_MEMO_CATEGORIES: readonly Omit<
  MemoCategory,
  "id" | "sortOrder"
>[] = [
  {
    name: "よかったこと",
    prompt: "今日よかったこと、3つ教えて。",
    dailyTarget: 3,
  },
  { name: "ぼやき", prompt: "今日のぼやき、聞かせて。", dailyTarget: null },
  { name: "気づき", prompt: "今日、気づいたことはある？", dailyTarget: null },
];

/** カテゴリの名前・お題の長さの上限 */
export const MEMO_CATEGORY_NAME_MAX = 20;
export const MEMO_PROMPT_MAX = 60;
/** カテゴリの1日の目標の上限 */
export const MEMO_DAILY_TARGET_MAX = 20;

/** お題。カテゴリで決めていなければ既定の文 */
export function promptOf(
  category: Pick<MemoCategory, "name" | "prompt">,
): string {
  return category.prompt ?? `今日の${category.name}、聞かせて。`;
}

/** 保存する形にそろえる：前後の空白を除く。空なら null（保存しない・消す） */
export function normalizeMemoBody(body: string): string | null {
  const trimmed = body.trim();
  return trimmed === "" ? null : trimmed;
}

/** 日付 → その日の件数。categoryId を渡すとそのカテゴリだけを数える */
export function countByDate(
  memos: readonly Pick<Memo, "date" | "categoryId">[],
  categoryId?: string,
): Map<LogicalDate, number> {
  const counts = new Map<LogicalDate, number>();
  for (const memo of memos) {
    if (categoryId !== undefined && memo.categoryId !== categoryId) continue;
    counts.set(memo.date, (counts.get(memo.date) ?? 0) + 1);
  }
  return counts;
}

export interface TargetDay {
  date: LogicalDate;
  count: number;
  achieved: boolean;
}

/** ⑨ の「目標の達成」カード（カテゴリの1日の目標） */
export interface TargetStats {
  categoryId: string;
  name: string;
  target: number;
  /** 今日書いた数 */
  todayCount: number;
  /** 今日の目標まであと何件（達成していれば 0） */
  remaining: number;
  /** 連続で達成した日数。今日がまだなら昨日まで（途中の今日で途切れさせない） */
  current: number;
  /** これまでの最長の連続 */
  longest: number;
  /** 今日を含む直近7日（古い順） */
  week: TargetDay[];
  /** 今月：達成した日数 / 数える日数（今日は達成していれば数える。まだなら昨日まで） */
  month: { achieved: number; days: number };
}

/**
 * カテゴリの1日の目標の達成（domain-spec.md 2章：その日の、そのカテゴリのメモの件数 ≥ daily_target）。
 * memos は、そのカテゴリのメモ（どの順でもよい）。目標がないカテゴリは null
 */
export function targetStats(
  category: MemoCategory,
  memos: readonly Pick<Memo, "date" | "categoryId">[],
  today: LogicalDate,
): TargetStats | null {
  const target = category.dailyTarget;
  if (target === null || target <= 0) return null;
  const counts = countByDate(memos, category.id);
  const countOn = (date: LogicalDate) => counts.get(date) ?? 0;
  const achievedOn = (date: LogicalDate) => countOn(date) >= target;

  const todayCount = countOn(today);
  const todayAchieved = todayCount >= target;

  let current = 0;
  for (
    let d = todayAchieved ? today : addDays(today, -1);
    achievedOn(d);
    d = addDays(d, -1)
  ) {
    current++;
  }

  // 最長：目標を達成した日を古い順に並べ、続いている長さを数える（未来の日は数えない）
  const achievedDates = [...counts.keys()]
    .filter((d) => d <= today && achievedOn(d))
    .sort();
  let longest = 0;
  let run = 0;
  let prev: LogicalDate | null = null;
  for (const d of achievedDates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, count: countOn(date), achieved: achievedOn(date) };
  });

  const [year, month, day] = splitDate(today);
  const lastDay = todayAchieved ? day : day - 1;
  let monthAchieved = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (achievedOn(makeLogicalDate(year, month, d))) monthAchieved++;
  }

  return {
    categoryId: category.id,
    name: category.name,
    target,
    todayCount,
    remaining: Math.max(0, target - todayCount),
    current,
    longest,
    week,
    month: { achieved: monthAchieved, days: Math.max(0, lastDay) },
  };
}

/** n か月前の同じ日（その月に同じ日がなければ月末） */
export function monthsBefore(date: LogicalDate, months: number): LogicalDate {
  const [year, month, day] = splitDate(date);
  const index = year * 12 + (month - 1) - months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return makeLogicalDate(y, m, Math.min(day, daysInMonth(y, m)));
}

/** 過去のメモのカードの見出し */
export type PastMemoReason = "yearAgo" | "monthAgo" | "random";

export const PAST_MEMO_HEADING: Record<PastMemoReason, string> = {
  yearAgo: "1年前の今日の自分",
  monthAgo: "1か月前の今日の自分",
  random: "ふと、あの日の自分",
};

export interface PastMemo<M> {
  memo: M;
  reason: PastMemoReason;
}

/**
 * ⑨ の「1年前の今日の自分」・一覧の「ふと、あの日の自分」に出す過去のメモの候補（出す順）。
 * 1年前の今日 → 1か月前の今日 → それ以外の昨日までのメモ（日替わりで混ぜる）の順。
 * 「別のメモ」で次の候補に進む。今日のメモと習慣へのひとことは出さない。最大 limit 件
 */
export function pastMemoCandidates<
  M extends Pick<Memo, "id" | "date" | "habitId">,
>(memos: readonly M[], today: LogicalDate, limit = 10): PastMemo<M>[] {
  const past = memos.filter((m) => m.date < today && m.habitId === null);
  const yearAgo = monthsBefore(today, 12);
  const monthAgo = monthsBefore(today, 1);
  const picked: PastMemo<M>[] = [];
  const used = new Set<string>();
  const take = (memo: M, reason: PastMemoReason) => {
    if (used.has(memo.id) || picked.length >= limit) return;
    used.add(memo.id);
    picked.push({ memo, reason });
  };
  for (const m of past) if (m.date === yearAgo) take(m, "yearAgo");
  for (const m of past) if (m.date === monthAgo) take(m, "monthAgo");
  // 残りは日替わりで並べ替える（同じ日なら同じ順。リロードしても変わらない）
  const rest = past
    .filter((m) => !used.has(m.id))
    .map((m) => ({ m, key: hashKey(`${today}:${m.id}`) }))
    .sort((a, b) => a.key - b.key);
  for (const { m } of rest) take(m, "random");
  return picked;
}

/** 並べ替えのための決まった値（FNV-1a） */
function hashKey(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** ⑨ の狛犬のひとこと */
export interface MemoSpeech {
  expression: Expression;
  text: string;
  /** 吹き出しの下のメタ情報（時刻のあと）。なければ null */
  meta: string | null;
  /** お題を出しているカテゴリ（書く画面でそのカテゴリを選んでおく）。なければ null */
  categoryId: string | null;
}

export interface MemoSpeechInput {
  /** 並び順のカテゴリ */
  categories: readonly MemoCategory[];
  /** 今日の、カテゴリごとの件数 */
  todayCounts: ReadonlyMap<string, number>;
  /** 今日書いたメモの件数（すべて。習慣へのひとことも含む） */
  todayTotal: number;
  /** 0〜23。ユーザーのタイムゾーンでの現在の時 */
  hour: number;
}

/**
 * 狛犬のひとこと（メモの聞き役。docs/design/character.md）。上から順に判定する。
 * 1. 目標がまだのカテゴリがある → happy（阿）でそのお題。「（3つめ）」のように次の番号を添える
 * 2. 22時以降で、今日まだ何も書いていない → sleepy
 * 3. 今日書いた → normal（吽）で聞いていた、と返す
 * 4. まだ書いていない → happy で最初のカテゴリのお題
 */
export function memoSpeech(input: MemoSpeechInput): MemoSpeech {
  const { categories, todayCounts, todayTotal, hour } = input;
  for (const category of categories) {
    const target = category.dailyTarget;
    if (target === null) continue;
    const count = todayCounts.get(category.id) ?? 0;
    if (count >= target) continue;
    const ordinal = target > 1 ? `（${count + 1}つめ）` : "";
    return {
      expression: "happy",
      text: `${promptOf(category)}${ordinal}`,
      meta: `${category.name} あと${target - count}つ`,
      categoryId: category.id,
    };
  }
  if (todayTotal === 0 && hour >= 22) {
    return {
      expression: "sleepy",
      text: "そろそろ寝る時間…。ひとことだけでも、聞かせて。",
      meta: null,
      categoryId: null,
    };
  }
  if (todayTotal > 0) {
    return {
      expression: "normal",
      text: "しまっておくね。ちゃんと聞いてたよ。",
      meta: `今日のメモ ${todayTotal}件`,
      categoryId: null,
    };
  }
  const first = categories[0];
  return {
    expression: "happy",
    text: first ? promptOf(first) : "今日はどんな日だった？ 聞かせて。",
    meta: null,
    categoryId: first?.id ?? null,
  };
}
