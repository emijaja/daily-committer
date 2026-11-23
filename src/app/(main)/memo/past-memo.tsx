"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Tag } from "@/components/Tag";
import type { PastMemoCard } from "@/server/services/types";
import { fullJaDate, monthHref } from "./memo-format";

export interface PastMemoProps {
  /** 出す順の候補（サーバーで決めたもの）。空なら何も出さない */
  cards: readonly PastMemoCard[];
  /** 見出しを固定する（⑨-d は「ふと、あの日の自分」）。省略なら候補ごとの見出し */
  heading?: string;
  className?: string;
}

/**
 * ⑨ の「1年前の今日の自分」・⑨-d の「ふと、あの日の自分」。
 * 「別のメモ」で次の候補に進む（最後まで行ったら最初に戻る）。
 */
export function PastMemo({ cards, heading, className }: PastMemoProps) {
  const [index, setIndex] = useState(0);
  const card = cards[index % Math.max(cards.length, 1)];
  if (!card) return null;
  const { memo } = card;
  const title = heading ?? card.heading;
  return (
    <section aria-label={title} className={className}>
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-bold">{title}</h2>
        <span aria-hidden="true" className="h-px flex-1 bg-gray-300" />
        {cards.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % cards.length)}
            className="min-h-8 text-[10px] font-bold underline underline-offset-2"
          >
            別のメモ
          </button>
        ) : null}
      </div>
      <article className="frame mt-3.5 bg-white px-3.5 py-3">
        <div className="flex items-center gap-2">
          {memo.tag ? <Tag variant="outline">{memo.tag}</Tag> : null}
          <span className="text-[10px] font-medium text-gray-500">
            {fullJaDate(memo.date)}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-[13px] leading-[1.6] font-bold break-words whitespace-pre-line">
          「{memo.body}」
        </p>
        <div className="mt-2 flex justify-end">
          <Link
            href={monthHref(memo.date)}
            className="inline-flex min-h-8 items-center gap-0.5 text-[11px] font-bold underline underline-offset-2"
          >
            その日を見る
            <Icon name="chevron-right" size={12} />
          </Link>
        </div>
      </article>
    </section>
  );
}
