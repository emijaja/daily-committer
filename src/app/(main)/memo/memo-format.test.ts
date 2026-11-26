import { describe, expect, it } from "vitest";
import type { LogicalDate } from "@/domain/types";
import {
  draftLabel,
  EXTRA_PROMPTS,
  fullJaDate,
  monthHref,
  speechLines,
  writeHref,
  writePrompt,
} from "./memo-format";

const d = (value: string) => value as LogicalDate;
const today = d("2026-11-21");
const good = {
  name: "よかったこと",
  prompt: "今日よかったこと、3つ教えて。",
  dailyTarget: 3,
};

describe("日付・リンク", () => {
  it("年つきの日付と、その月の一覧へのリンク", () => {
    expect(fullJaDate(d("2025-11-21"))).toBe("2025年11月21日（金）");
    expect(monthHref(d("2025-06-14"))).toBe("/memo/all?month=2025-06");
  });

  it("書く画面へのリンクに、カテゴリ・日付・下書きを付ける", () => {
    expect(writeHref()).toBe("/memo/new");
    expect(writeHref({ categoryId: null })).toBe("/memo/new");
    expect(writeHref({ categoryId: "c1", date: d("2026-11-18") })).toBe(
      "/memo/new?category=c1&date=2026-11-18",
    );
    expect(writeHref({ draft: true })).toBe("/memo/new?draft=1");
  });

  it("下書きの入り口の文", () => {
    expect(draftLabel({ date: today, categoryName: "ぼやき" }, today)).toBe(
      "ぼやき ・ 今日の書きかけ",
    );
    expect(
      draftLabel({ date: d("2026-11-20"), categoryName: null }, today),
    ).toBe("11月20日（金）の書きかけ");
  });
});

describe("writePrompt", () => {
  it("今日は、目標がまだなら次の番号を添える。達成していれば番号なし", () => {
    expect(writePrompt(good, today, today, { todayCount: 2 })).toBe(
      "今日よかったこと、3つ教えて。（3つめ）",
    );
    expect(writePrompt(good, today, today, { todayCount: 3 })).toBe(
      "今日よかったこと、3つ教えて。",
    );
  });

  it("過去の日は、その日のことを聞く。カテゴリがなければ日のこと", () => {
    expect(writePrompt(good, d("2026-11-18"), today)).toBe(
      "11月18日は、どんなよかったことがあった？",
    );
    expect(writePrompt(null, d("2026-11-18"), today)).toBe(
      "11月18日は、どんな日だった？",
    );
    expect(writePrompt(null, today, today)).toBe(
      "今日はどんな日だった？ 聞かせて。",
    );
  });

  it("お題を変えると、ほかのお題を順に出し、ひと回りすると元に戻る", () => {
    expect(writePrompt(good, today, today, { index: 1 })).toBe(
      EXTRA_PROMPTS[0],
    );
    expect(
      writePrompt(good, today, today, {
        index: EXTRA_PROMPTS.length + 1,
        todayCount: 1,
      }),
    ).toBe("今日よかったこと、3つ教えて。（2つめ）");
  });
});

describe("speechLines", () => {
  it("長い文は最初の「、」のあとで改行し、短い文や「、」が後ろの文はそのまま", () => {
    expect(speechLines("今日よかったこと、3つ教えて。（3つめ）")).toBe(
      "今日よかったこと、\n3つ教えて。（3つめ）",
    );
    expect(speechLines("今日のぼやき、聞かせて。")).toBe(
      "今日のぼやき、聞かせて。",
    );
    expect(speechLines("しまっておくね。ちゃんと聞いてたよ。")).toBe(
      "しまっておくね。ちゃんと聞いてたよ。",
    );
  });
});
