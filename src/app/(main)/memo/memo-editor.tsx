"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { CalendarModal } from "@/components/CalendarModal";
import { cx, HIT_AREA } from "@/components/cx";
import { Icon } from "@/components/icons";
import { Marker } from "@/components/Marker";
import { Pill } from "@/components/Pill";
import { MascotSpeech } from "@/components/Speech";
import { Toast } from "@/components/Toast";
import { splitDate } from "@/domain/date";
import { noteLength } from "@/domain/note";
import type { GrassLevel } from "@/domain/grass";
import type { LogicalDate } from "@/domain/types";
import {
  createMemoAction,
  saveDraftAction,
  updateMemoAction,
} from "@/server/actions/memo";
import type { MemoDayStatus, MemoWriteView } from "@/server/services/types";
import { jaDate, writeHref, writePrompt } from "./memo-format";

/** カレンダーの印：目標を達成＝黒、書いた＝灰、なし＝白（CalendarModal の草の段階に当てる） */
const STATUS_LEVEL: Record<MemoDayStatus, GrassLevel> = {
  achieved: 3,
  written: 2,
  none: 0,
};

export interface MemoEditorProps {
  view: MemoWriteView;
  /** 閉じたあと・保存したあとに戻る先（新しく書く画面は ⑨、編集は一覧） */
  backHref: string;
}

/**
 * ⑨-b 書く／メモの編集（Figma 2165:5524・2168:5534・2183:5701）。
 * - 上：キャンセル・（書きかけがあれば）下書き・送る（編集は保存）
 * - 日付（カレンダーで選ぶ。過去の日は「11月18日のメモとして残ります」）、狛犬のお題、カテゴリ、本文
 * - 下：お題を変える・文字数・下書き保存
 * - 書いている途中でキャンセルすると、下書きに保存するか聞く（⑨-d、Figma 2168:5593）
 */
export function MemoEditor({ view, backHref }: MemoEditorProps) {
  const router = useRouter();
  const textareaId = useId();
  const editing = view.memo !== null;
  const [date, setDate] = useState<LogicalDate>(view.initial.date);
  const [categoryId, setCategoryId] = useState<string | null>(
    view.initial.categoryId,
  );
  const [body, setBody] = useState(view.initial.body);
  const [promptIndex, setPromptIndex] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const category = view.categories.find((c) => c.id === categoryId) ?? null;
  const length = noteLength(body.trim());
  const changed =
    body !== view.initial.body ||
    date !== view.initial.date ||
    categoryId !== view.initial.categoryId;
  const prompt = writePrompt(category, date, view.today, {
    index: promptIndex,
    todayCount: categoryId ? (view.todayCounts[categoryId] ?? 0) : 0,
  });

  const fail = (message: string) => setToast({ key: Date.now(), message });

  const send = () => {
    if (length === 0 && !editing) {
      fail("メモを書いてください");
      return;
    }
    startTransition(async () => {
      const result = editing
        ? await updateMemoAction({
            memoId: view.memo!.id,
            date,
            categoryId: view.memo!.isHabitNote ? null : categoryId,
            body,
          })
        : await createMemoAction({
            date,
            categoryId,
            body,
            fromDraft: view.fromDraft,
          });
      if (!result.ok) {
        fail(result.error);
        return;
      }
      router.push(backHref);
    });
  };

  const saveDraft = () => {
    startTransition(async () => {
      const result = await saveDraftAction({ date, categoryId, body });
      if (!result.ok) {
        fail(result.error);
        return;
      }
      router.push(backHref);
    });
  };

  const cancel = () => {
    // 何も書いていない・変えていないなら、そのまま閉じる
    if (!changed || (!editing && length === 0)) {
      router.push(backHref);
      return;
    }
    setClosing(true);
  };

  const closeSheet = useCallback(() => setClosing(false), []);
  const closeCalendar = useCallback(() => setCalendarOpen(false), []);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="px-screen-x flex min-h-14 items-center gap-3 pt-2">
        <button
          type="button"
          onClick={cancel}
          className={cx("text-[14px] font-bold", HIT_AREA)}
        >
          キャンセル
        </button>
        <span className="flex-1" />
        {view.draft && !editing ? (
          <Link
            href={writeHref({ draft: true })}
            className="min-h-8 text-[12px] font-bold underline underline-offset-2"
          >
            下書き
          </Link>
        ) : null}
        <Pill
          size="md"
          block={false}
          disabled={pending || (!editing && length === 0)}
          onClick={send}
          className="h-[38px] px-5 text-[13px]"
        >
          {editing ? "保存" : "送る"}
        </Pill>
      </div>

      <h1 className="sr-only">{editing ? "メモの編集" : "メモを書く"}</h1>

      <div className="px-screen-x mt-2 flex flex-wrap items-center gap-2">
        <DatePill
          date={date}
          today={view.today}
          onClick={() => setCalendarOpen(true)}
        />
        {date !== view.today ? (
          <span className="text-[10px]">
            <Marker>
              {jaDate(date).replace(/（.*）/, "")}のメモとして残ります
            </Marker>
          </span>
        ) : null}
      </div>

      <MascotSpeech
        character="komainu"
        expression="happy"
        form="icon"
        className="px-screen-x mt-4"
      >
        {prompt}
      </MascotSpeech>

      {view.memo?.isHabitNote ? (
        <p className="px-screen-x mt-4 text-[11px] font-bold text-gray-500">
          {view.memo.tag ? `${view.memo.tag}へのひとこと` : "習慣へのひとこと"}
          （カテゴリは選べません）
        </p>
      ) : (
        <CategoryChips
          categories={view.categories}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setPromptIndex(0);
          }}
        />
      )}

      <label htmlFor={textareaId} className="sr-only">
        メモの本文
      </label>
      <textarea
        id={textareaId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
        placeholder={category ? `${category.name}を書く` : "メモを書く"}
        className="px-screen-x mt-4 block min-h-[180px] w-full flex-1 resize-none bg-white text-[17px] leading-[1.7] font-medium outline-none placeholder:text-gray-300"
      />

      <div className="px-screen-x sticky bottom-0 flex min-h-[50px] items-center gap-3 border-t border-black bg-white pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => setPromptIndex((i) => i + 1)}
          className="min-h-11 text-[12px] font-bold underline underline-offset-2"
        >
          お題を変える
        </button>
        <span className="flex-1" />
        <span className="text-[11px] font-bold text-gray-500">
          <span className="font-latin">{length}</span>字
        </span>
        {editing ? null : (
          <Pill
            variant="secondary"
            size="sm"
            block={false}
            disabled={pending || length === 0}
            onClick={saveDraft}
          >
            下書き保存
          </Pill>
        )}
      </div>

      <MemoCalendar
        open={calendarOpen}
        view={view}
        selected={date}
        onSelect={(d) => {
          setDate(d);
          setPromptIndex(0);
          setCalendarOpen(false);
        }}
        onClose={closeCalendar}
      />

      <BottomSheet
        open={closing}
        onClose={closeSheet}
        title={
          editing ? "変更を保存せずに閉じますか？" : "下書きに保存しますか？"
        }
        subtitle={
          editing
            ? "閉じると、いまの変更は消えます"
            : "あとで「下書き」から、続きを書けます"
        }
        className="[&_h2]:font-sans [&_h2]:text-[16px] [&_h2]:leading-6"
      >
        <div className="space-y-3">
          {editing ? null : (
            <Pill disabled={pending} onClick={saveDraft}>
              下書きに保存
            </Pill>
          )}
          <Pill
            variant="secondary"
            disabled={pending}
            onClick={() => router.push(backHref)}
          >
            保存せずに閉じる
          </Pill>
          <button
            type="button"
            onClick={closeSheet}
            className="block min-h-11 w-full text-[12px] font-bold"
          >
            書き続ける
          </button>
        </div>
      </BottomSheet>

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </main>
  );
}

/** 日付のボタン：カレンダーのアイコン・11月21日（金）・今日・▼ */
function DatePill({
  date,
  today,
  onClick,
}: {
  date: LogicalDate;
  today: LogicalDate;
  onClick: () => void;
}) {
  const isToday = date === today;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`日付を選ぶ（${jaDate(date)}${isToday ? "・今日" : ""}）`}
      className={cx(
        "rounded-pill inline-flex h-[31px] items-center gap-1.5 border-[1.5px] border-black px-3.5 text-[12px] font-bold",
        isToday ? "bg-white text-black" : "bg-black text-white",
        HIT_AREA,
      )}
    >
      <Icon name="calendar" size={14} />
      {jaDate(date)}
      {isToday ? (
        <span className="text-[10px] font-medium text-gray-500">今日</span>
      ) : null}
      <Icon name="chevron-down" size={10} />
    </button>
  );
}

/** カテゴリを選ぶ（1つ）。最後の＋でカテゴリを足す（⑨-c） */
function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: MemoWriteView["categories"];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="px-screen-x mt-4 flex flex-wrap gap-1.5">
      <div role="radiogroup" aria-label="カテゴリ" className="contents">
        {categories.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : c.id)}
              className={cx(
                "rounded-pill h-7 border-[1.5px] border-black px-3 text-[12px] font-bold",
                selected ? "bg-black text-white" : "bg-white text-black",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      <Link
        href="/memo/categories/new"
        aria-label="カテゴリを足す"
        className="rounded-pill flex h-7 items-center border-[1.5px] border-black px-3 text-[12px] font-bold"
      >
        ＋
      </Link>
    </div>
  );
}

/** 日付を選ぶカレンダー（⑨-b 参考、Figma 2183:5762）。12か月前の月まで遡れる */
function MemoCalendar({
  open,
  view,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean;
  view: MemoWriteView;
  selected: LogicalDate;
  onSelect: (date: LogicalDate) => void;
  onClose: () => void;
}) {
  const [sy, sm] = splitDate(selected);
  const [month, setMonth] = useState({ year: sy, month: sm });
  const first = view.calendar[0]?.date ?? view.today;
  const [fy, fm] = splitDate(first);
  const [ty, tm] = splitDate(view.today);
  const index = month.year * 12 + month.month;
  const cells = useMemo(
    () =>
      view.calendar.map((c) => ({
        date: c.date,
        level: STATUS_LEVEL[c.status],
      })),
    [view.calendar],
  );
  // 開くたびに選んでいる日の月に戻す（描画中に前回の open と比べる）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMonth({ year: sy, month: sm });
  }
  const move = (delta: number) => {
    const next = index - 1 + delta;
    setMonth({ year: Math.floor(next / 12), month: (next % 12) + 1 });
  };
  return (
    <CalendarModal
      open={open}
      year={month.year}
      month={month.month}
      cells={cells}
      weekStart={view.weekStart}
      today={view.today}
      selected={selected}
      onSelect={onSelect}
      onPrev={() => move(-1)}
      onNext={() => move(1)}
      canPrev={index > fy * 12 + fm}
      canNext={index < ty * 12 + tm}
      onClose={onClose}
      onToday={() => onSelect(view.today)}
      hint="日付を選ぶと、その日のメモとして書きます"
      legend={
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-medium text-gray-500">
          <LegendItem className="bg-grass-3">目標を達成</LegendItem>
          <LegendItem className="bg-grass-2">書いた</LegendItem>
          <LegendItem className="border border-gray-300 bg-white">
            なし
          </LegendItem>
          <LegendItem className="bg-yellow">今日</LegendItem>
        </ul>
      }
    />
  );
}

function LegendItem({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  return (
    <li className="flex items-center gap-1">
      <span aria-hidden="true" className={cx("size-[7px]", className)} />
      {children}
    </li>
  );
}
