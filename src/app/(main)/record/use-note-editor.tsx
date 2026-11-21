"use client";

import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { NoteSheet } from "@/components/NoteSheet";
import { normalizeNote } from "@/domain/note";
import type { LogicalDate } from "@/domain/types";
import { saveNoteAction } from "@/server/actions/record";
import type { RecordRow } from "@/server/services/types";
import { jaDate } from "./record-format";

/** 習慣 ID → その日のひとこと */
type NotesByHabit = Readonly<Record<string, string | null>>;

export interface NoteEditorOptions {
  /** 表示している行（① の期間の行、② のすべての行）。楽観的に書き換えた記録を反映したもの */
  rows: readonly RecordRow[];
  /** ひとことを付ける日（① は今日、② は選んだ日） */
  date: LogicalDate;
  /** 画面の transition。保存中を画面の isPending に含める（① は保存中のスワイプを止める） */
  startTransition: TransitionStartFunction;
  /** 失敗・削除を知らせるトースト。undo を渡すと「取り消す」を出す */
  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
}

export interface NoteEditor {
  /** 楽観的に書き換えたひとこと（習慣 ID → 本文） */
  notes: NotesByHabit;
  /** シートを開いているか（① はそのあいだスワイプを止める） */
  isOpen: boolean;
  /** □／＋の長押しで、その行のシートを開く */
  open: (row: RecordRow) => void;
  /** 画面に置くシート */
  sheet: ReactNode;
}

/**
 * ①② の □／＋ の長押しで開く、ひとことシート（⑩-a/b）の状態と保存。
 * 保存は楽観的に反映し、失敗したら元に戻してトーストで知らせる。消したときは「取り消す」で戻せる。
 */
export function useNoteEditor({
  rows,
  date,
  startTransition,
  showToast,
  hideToast,
}: NoteEditorOptions): NoteEditor {
  const base = useMemo<NotesByHabit>(
    () => Object.fromEntries(rows.map((r) => [r.habit.id, r.note ?? null])),
    [rows],
  );
  const [notes, setOptimisticNote] = useOptimistic(
    base,
    (state, op: { habitId: string; note: string | null }) => ({
      ...state,
      [op.habitId]: op.note,
    }),
  );
  const [habitId, setHabitId] = useState<string | null>(null);
  // BottomSheet は onClose が変わるとフォーカスを当て直すので、同じ関数を渡し続ける
  const close = useCallback(() => setHabitId(null), []);
  const row = rows.find((r) => r.habit.id === habitId) ?? null;

  function save(target: RecordRow, body: string, withUndo: boolean) {
    const id = target.habit.id;
    const before = notes[id] ?? null;
    startTransition(async () => {
      setOptimisticNote({ habitId: id, note: normalizeNote(body) });
      const result = await saveNoteAction({ habitId: id, date, body });
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      if (withUndo && result.data.note === null && before !== null) {
        showToast(`${target.habit.name}：ひとことを削除しました`, () => {
          hideToast();
          save(target, before, false);
        });
      }
    });
  }

  const recorded = (row?.entries ?? []).some((e) => e.date === date);
  const sheet = (
    <NoteSheet
      open={row !== null}
      onClose={close}
      habitName={row?.habit.name ?? ""}
      dateLabel={jaDate(date)}
      recorded={recorded}
      initialBody={row ? (notes[row.habit.id] ?? null) : null}
      onSave={(body) => {
        if (!row) return;
        close();
        if (normalizeNote(body) === (notes[row.habit.id] ?? null)) return;
        save(row, body, true);
      }}
      onDelete={() => {
        if (!row) return;
        close();
        save(row, "", true);
      }}
    />
  );

  return {
    notes,
    isOpen: row !== null,
    open: (target) => setHabitId(target.habit.id),
    sheet,
  };
}
