"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { cx, HIT_AREA } from "@/components/cx";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/Pill";
import { Tag } from "@/components/Tag";
import { Toast } from "@/components/Toast";
import { noteLength } from "@/domain/note";
import { deleteMemoAction } from "@/server/actions/memo";
import type { MemoItem, MemoListView } from "@/server/services/types";
import { fullJaDate, jaDate, writeHref } from "../memo-format";
import { PastMemo } from "../past-memo";
import { WriteFab } from "../write-fab";

/** ⑨-d の URL（月・カテゴリ） */
function listHref(
  month: { year: number; month: number },
  categoryId: string | null,
) {
  const params = new URLSearchParams({
    month: `${month.year}-${String(month.month).padStart(2, "0")}`,
  });
  if (categoryId) params.set("category", categoryId);
  return `/memo/all?${params.toString()}`;
}

function shiftMonth(view: MemoListView, delta: number) {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * ⑨-d すべてのメモ（Figma 2178:5696）と ⑨-e メモを開く（Figma 2179:5692）。
 * - ふと、あの日の自分 → カテゴリで絞り込み → 月（前・次）→ 日ごとのメモ
 * - メモを押すとモーダルで全文を出し、編集・削除ができる
 */
export function MemoListScreen({ view }: { view: MemoListView }) {
  const [opened, setOpened] = useState<MemoItem | null>(null);
  // 消したメモは、サーバーの再描画を待たずに一覧から外す
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const days = view.days
    .map((day) => ({
      ...day,
      memos: day.memos.filter((m) => !removed.has(m.id)),
    }))
    .filter((day) => day.memos.length > 0);
  const count = days.reduce((n, day) => n + day.memos.length, 0);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const close = useCallback(() => setOpened(null), []);
  const current = { year: view.year, month: view.month };

  return (
    <div className="px-screen-x pb-24">
      <PastMemo
        cards={view.pastMemos}
        heading="ふと、あの日の自分"
        className="mt-3"
      />

      <nav
        aria-label="カテゴリで絞り込む"
        className="-mx-screen-x px-screen-x mt-5 flex gap-1.5 overflow-x-auto pb-1"
      >
        <FilterChip
          href={listHref(current, null)}
          selected={view.categoryId === null}
        >
          すべて
        </FilterChip>
        {view.categories.map((c) => (
          <FilterChip
            key={c.id}
            href={listHref(current, c.id)}
            selected={view.categoryId === c.id}
          >
            {c.name}
          </FilterChip>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-2">
        <h2 className="font-latin text-[22px] leading-[27px] font-black">
          {view.year}.{String(view.month).padStart(2, "0")}
        </h2>
        <span className="text-[10px] font-bold">{count}件</span>
        <span className="flex-1" />
        <MonthLink
          href={listHref(shiftMonth(view, -1), view.categoryId)}
          disabled={!view.canPrev}
          label="前の月"
        />
        <MonthLink
          href={listHref(shiftMonth(view, 1), view.categoryId)}
          disabled={!view.canNext}
          label="次の月"
          next
        />
      </div>

      {days.length === 0 ? (
        <p className="mt-6 text-[12px] font-medium text-gray-500">
          この月のメモはまだありません
        </p>
      ) : (
        days.map((day) => (
          <section
            key={day.date}
            aria-label={jaDate(day.date)}
            className="mt-4"
          >
            <h3 className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold">{jaDate(day.date)}</span>
              <span className="text-[10px] font-medium text-gray-500">
                {day.memos.length}件
              </span>
            </h3>
            <ul className="frame mt-2 bg-white">
              {day.memos.map((memo, i) => (
                <li
                  key={memo.id}
                  className={cx(i > 0 && "border-t border-black")}
                >
                  <button
                    type="button"
                    onClick={() => setOpened(memo)}
                    className="block w-full px-3.5 pt-[11px] pb-3 text-left"
                  >
                    <span className="flex items-center gap-2">
                      {memo.tag ? (
                        <Tag variant="outline">{memo.tag}</Tag>
                      ) : null}
                      <span className="flex-1" />
                      <span className="font-latin text-[10px] font-bold text-gray-500">
                        {memo.time}
                      </span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-[13px] leading-[1.6] font-medium break-words whitespace-pre-line">
                      {memo.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <WriteFab href={writeHref()} />

      <MemoModal
        memo={opened}
        onClose={close}
        onDeleted={(memoId) => {
          setRemoved((prev) => new Set(prev).add(memoId));
          setOpened(null);
          setToast({ key: Date.now(), message: "メモを削除しました" });
        }}
        onError={(message) => setToast({ key: Date.now(), message })}
      />
      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

function FilterChip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      replace
      aria-current={selected ? "page" : undefined}
      className={cx(
        "rounded-pill flex h-[25px] shrink-0 items-center border-[1.2px] border-black px-3 text-[11px] font-bold whitespace-nowrap",
        selected ? "bg-black text-white" : "bg-white text-black",
        HIT_AREA,
      )}
    >
      {children}
    </Link>
  );
}

function MonthLink({
  href,
  disabled,
  label,
  next,
}: {
  href: string;
  disabled: boolean;
  label: string;
  next?: boolean;
}) {
  const icon = (
    <Icon name="chevron-left" size={18} className={cx(next && "rotate-180")} />
  );
  if (disabled) {
    return (
      <span aria-label={label} aria-disabled="true" className="text-gray-300">
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} replace aria-label={label} className={HIT_AREA}>
      {icon}
    </Link>
  );
}

/** ⑨-e メモを開く：全文・文字数・削除・編集する */
function MemoModal({
  memo,
  onClose,
  onDeleted,
  onError,
}: {
  memo: MemoItem | null;
  onClose: () => void;
  onDeleted: (memoId: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!memo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [memo, onClose]);

  if (!memo) return null;

  const remove = () => {
    startTransition(async () => {
      const result = await deleteMemoAction({ memoId: memo.id });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDeleted(memo.id);
      router.refresh();
    });
  };

  return (
    <div className="bg-scrim px-screen-x fixed inset-0 z-50 flex items-center justify-center py-10">
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="frame relative flex max-h-full w-full max-w-[335px] flex-col bg-white outline-none"
      >
        <div className="flex items-center gap-2 border-b border-black px-4 py-3">
          {memo.tag ? <Tag variant="outline">{memo.tag}</Tag> : null}
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-500"
          >
            {fullJaDate(memo.date)} {memo.time}
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className={cx("shrink-0", HIT_AREA)}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="min-h-[120px] overflow-y-auto px-4 py-4 text-[14px] leading-[1.85] font-medium break-words whitespace-pre-line">
          {memo.body}
        </p>
        <div className="flex items-center gap-4 border-t border-black px-4 py-3">
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-latin">{noteLength(memo.body)}</span>字
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="min-h-11 text-[11px] font-bold underline underline-offset-2 disabled:opacity-40"
          >
            削除
          </button>
          <Pill
            variant="secondary"
            size="md"
            block={false}
            onClick={() => {
              // 開いたまま移ると、戻ったときにモーダルが開いたまま残る（前の画面の状態を残すため）
              onClose();
              router.push(`/memo/${memo.id}/edit`);
            }}
          >
            編集する
          </Pill>
        </div>
      </div>
    </div>
  );
}
