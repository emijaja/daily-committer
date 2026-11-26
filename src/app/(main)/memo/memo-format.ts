/**
 * ⑨ メモの画面の表示用の文字列を作る小さな関数（純粋関数）。
 * 日付の文字列は ① と同じものを record-format.ts から使う。
 */
import { splitDate } from "@/domain/date";
import { promptOf, type MemoCategory } from "@/domain/memo";
import type { LogicalDate } from "@/domain/types";
import { jaDate } from "../record/record-format";

export { jaDate };

/** 2025年11月21日（金） */
export function fullJaDate(date: LogicalDate): string {
  const [y] = splitDate(date);
  return `${y}年${jaDate(date)}`;
}

/** 一覧・過去のメモの「その日を見る」の行き先（⑨-d のその月） */
export function monthHref(date: LogicalDate): string {
  const [y, m] = splitDate(date);
  return `/memo/all?month=${y}-${String(m).padStart(2, "0")}`;
}

/** 新しく書く画面（⑨-b）の行き先。カテゴリ・日付を選んでおける */
export function writeHref(
  options: {
    categoryId?: string | null;
    date?: LogicalDate;
    draft?: boolean;
  } = {},
): string {
  const params = new URLSearchParams();
  if (options.categoryId) params.set("category", options.categoryId);
  if (options.date) params.set("date", options.date);
  if (options.draft) params.set("draft", "1");
  const query = params.toString();
  return query ? `/memo/new?${query}` : "/memo/new";
}

/** 下書きの入り口の文（例：よかったこと ・ 11月21日（金）の書きかけ） */
export function draftLabel(
  draft: { date: LogicalDate; categoryName: string | null },
  today: LogicalDate,
): string {
  const day = draft.date === today ? "今日" : jaDate(draft.date);
  return [draft.categoryName, `${day}の書きかけ`]
    .filter((part) => part !== null)
    .join(" ・ ");
}

/** 「お題を変える」で順に出す、カテゴリのお題のあとのお題 */
export const EXTRA_PROMPTS = [
  "今日、いちばん心に残ったことは？",
  "最近、ちょっとうれしかったことは？",
  "いま、頭の中にあることを書いてみて。",
] as const;

/**
 * ⑨-b の狛犬のお題。
 * - 今日：カテゴリのお題。目標がまだなら「（3つめ）」と次の番号を添える（index が 1 以上なら EXTRA_PROMPTS を順に）
 * - 過去の日：「11月18日は、どんなよかったことがあった？」（index が 1 以上なら同じく EXTRA_PROMPTS）
 * カテゴリがなければ「今日はどんな日だった？ 聞かせて。」
 */
export function writePrompt(
  category: Pick<MemoCategory, "name" | "prompt" | "dailyTarget"> | null,
  date: LogicalDate,
  today: LogicalDate,
  options: { index?: number; todayCount?: number } = {},
): string {
  const { index = 0, todayCount = 0 } = options;
  const turn = index % (EXTRA_PROMPTS.length + 1);
  if (turn > 0) return EXTRA_PROMPTS[turn - 1]!;
  if (date !== today) {
    const [, m, d] = splitDate(date);
    return category
      ? `${m}月${d}日は、どんな${category.name}があった？`
      : `${m}月${d}日は、どんな日だった？`;
  }
  if (!category) return "今日はどんな日だった？ 聞かせて。";
  const target = category.dailyTarget;
  const ordinal =
    target !== null && target > 1 && todayCount < target
      ? `（${todayCount + 1}つめ）`
      : "";
  return `${promptOf(category)}${ordinal}`;
}

/** 吹き出しの文を、最初の「、」のあとで改行する（Figma ⑨ のように2行に分ける。短い文はそのまま） */
export function speechLines(text: string): string {
  const at = text.indexOf("、");
  if (text.length <= 14 || at < 0 || at > 12) return text;
  return `${text.slice(0, at + 1)}\n${text.slice(at + 1)}`;
}
