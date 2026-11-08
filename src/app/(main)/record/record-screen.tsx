"use client";

import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { EmptyState, EmptyStateLink } from "@/components/EmptyState";
import { HabitList, HabitRow, type HabitRowProps } from "@/components/HabitRow";
import { Icon } from "@/components/icons";
import { PillLink } from "@/components/Pill";
import { formatQuantity } from "@/components/quantity";
import { SegmentTabs } from "@/components/SegmentTabs";
import { MascotSpeech } from "@/components/Speech";
import { SummaryCard } from "@/components/SummaryCard";
import { Tag } from "@/components/Tag";
import { Toast } from "@/components/Toast";
import type { Period } from "@/domain/types";
import {
  addQuantityAction,
  deleteEntryAction,
  repeatLastQuantityAction,
  setQuantityTotalAction,
  toggleCheckAction,
} from "@/server/actions/record";
import type {
  ActionResult,
  RecordRow,
  RecordView,
} from "@/server/services/types";
import {
  PERIOD_HREF,
  PERIOD_LABEL,
  quantityOn,
  rowCaption,
  speechMeta,
  summaryLabel,
  summaryMessage,
  tabCount,
  weekDays,
} from "./record-format";
import {
  applyRecordOp,
  entriesByHabit,
  recompute,
  type RecordOp,
} from "./record-optimistic";
import { QuantitySheet } from "./quantity-sheet";

const PERIODS: readonly Period[] = ["daily", "weekly", "monthly"];

interface ToastState {
  /** 続けて出したときにタイマーを数え直すための key */
  key: number;
  message: string;
  /** 取り消し。なければボタンを出さない */
  undo?: () => void;
}

export interface RecordScreenProps {
  view: RecordView;
  /** 吹き出しの下の時刻（例 21:04） */
  clock: string;
}

/** ①-a/b/c の本体（集計・タブ・行・ぼやき）。□のタップは楽観的に更新する */
export function RecordScreen({ view, clock }: RecordScreenProps) {
  const base = useMemo(() => entriesByHabit(view.rows), [view.rows]);
  const [entries, applyOptimistic] = useOptimistic(base, applyRecordOp);
  const { rows, summary, tabSummaries } = useMemo(
    () => recompute(view, entries),
    [view, entries],
  );
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);
  /** 量の記録のシート（⑧-a/b）を開いている習慣 */
  const [sheetHabitId, setSheetHabitId] = useState<string | null>(null);
  const sheetRow = rows.find((r) => r.habit.id === sheetHabitId) ?? null;
  // BottomSheet は onClose が変わるとフォーカスを当て直すので、同じ関数を渡し続ける
  const closeSheet = useCallback(() => setSheetHabitId(null), []);

  const showToast = (message: string, undo?: () => void) =>
    setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message, undo }));

  /**
   * 楽観的に op を当ててから Server Action を呼ぶ。失敗したら（transition が終わると）元に戻り、
   * トーストで知らせる。成功したら revalidatePath で届いた本当のデータに置き換わる。
   */
  function mutate<T>(
    op: RecordOp | null,
    call: () => Promise<ActionResult<T>>,
    onSuccess?: (data: T) => void,
  ) {
    startTransition(async () => {
      if (op) applyOptimistic(op);
      const result = await call();
      if (!result.ok) showToast(result.error);
      else onSuccess?.(result.data);
    });
  }

  const deleteEntry = (entryId: string) =>
    mutate({ type: "delete", entryId }, () => deleteEntryAction({ entryId }));

  /** チェックのみの習慣：今日の記録を付ける／外す */
  function toggleToday(row: RecordRow, withToast: boolean) {
    const habitId = row.habit.id;
    mutate(
      { type: "toggle", habitId, date: view.today },
      () => toggleCheckAction({ habitId, date: view.today }),
      (data) => {
        if (!withToast) return;
        showToast(
          `${row.habit.name}：今日の分を${data.checked ? "記録" : "取り消し"}しました`,
          () => {
            setToast(null);
            mutate({ type: "toggle", habitId, date: view.today }, () =>
              toggleCheckAction({ habitId, date: data.date }),
            );
          },
        );
      },
    );
  }

  /**
   * ＋の長押し：前回と同じ量ですぐに記録し、取り消しのトーストを出す。
   * 「合計を入力」で今日の記録がすでにあるときは、上書きせずにシートを開く
   * （取り消しで元の合計を消してしまわないため。service の repeatLastQuantity と同じ考え）
   */
  function repeatLast(row: RecordRow) {
    const { habit } = row;
    if (
      habit.inputMode === "total" &&
      quantityOn(row.entries ?? [], view.today) > 0
    ) {
      setSheetHabitId(habit.id);
      return;
    }
    mutate(
      null,
      () => repeatLastQuantityAction({ habitId: habit.id, date: view.today }),
      ({ entryId, quantity }) =>
        showToast(
          `${habit.name} ${formatQuantity(quantity)} ${habit.unit ?? ""}を記録しました`,
          () => {
            setToast(null);
            deleteEntry(entryId);
          },
        ),
    );
  }

  /** ⑧-a：今日の合計を上書きする（0 なら記録を消す） */
  function setTotal(row: RecordRow, quantity: number) {
    const habitId = row.habit.id;
    mutate({ type: "setTotal", habitId, date: view.today, quantity }, () =>
      setQuantityTotalAction({ habitId, date: view.today, quantity }),
    );
  }

  /** ⑧-b：今日の分を1回追加し、取り消しのトーストを出す */
  function addOnce(row: RecordRow, quantity: number) {
    const { habit } = row;
    setSheetHabitId(null);
    mutate(
      { type: "add", habitId: habit.id, date: view.today, quantity },
      () =>
        addQuantityAction({ habitId: habit.id, date: view.today, quantity }),
      ({ entryId }) =>
        showToast(
          `${habit.name} ${formatQuantity(quantity)} ${habit.unit ?? ""}を記録しました`,
          () => {
            setToast(null);
            deleteEntry(entryId);
          },
        ),
    );
  }

  /** ⑧-b：記録の一覧から1件を削除する。取り消すと同じ日に同じ量を追加し直す */
  function deleteOnce(row: RecordRow, entryId: string) {
    const { habit } = row;
    const entry = row.entries?.find((e) => e.id === entryId);
    if (!entry) return;
    const quantity = entry.quantity ?? 0;
    mutate(
      { type: "delete", entryId },
      () => deleteEntryAction({ entryId }),
      () =>
        showToast(
          `${habit.name} ${formatQuantity(quantity)} ${habit.unit ?? ""}の記録を削除しました`,
          () => {
            setToast(null);
            mutate(
              { type: "add", habitId: habit.id, date: entry.date, quantity },
              () =>
                addQuantityAction({
                  habitId: habit.id,
                  date: entry.date,
                  quantity,
                }),
            );
          },
        ),
    );
  }

  function rowProps(row: RecordRow): HabitRowProps {
    const { habit, progress } = row;
    const caption = rowCaption(habit, progress, row.streak);
    const week =
      habit.period === "weekly"
        ? {
            days: weekDays(progress.range, view.today, progress.recordedDates),
          }
        : undefined;

    if (habit.recordType === "check") {
      const target = progress.target ?? 1;
      if (habit.period === "daily") {
        return {
          name: habit.name,
          caption,
          control: {
            type: "check",
            checked: progress.achieved,
            onChange: () => toggleToday(row, false),
          },
        };
      }
      // 週次・月次は、タップで今日の分を付け外しする。期間の達成と今日の記録が一致しないので、トーストで知らせる
      return {
        name: habit.name,
        caption,
        amount: { value: progress.current, target, unit: "回" },
        progress: target > 1 && !week ? progress.current / target : undefined,
        week,
        control:
          target > 1
            ? {
                type: "add",
                done: progress.achieved,
                onPress: () => toggleToday(row, true),
              }
            : {
                type: "check",
                checked: progress.achieved,
                onChange: () => toggleToday(row, true),
              },
      };
    }

    const unit = habit.unit ?? "";
    return {
      name: habit.name,
      caption,
      amount: {
        value: formatQuantity(progress.current),
        target:
          progress.target !== null
            ? formatQuantity(progress.target)
            : undefined,
        unit,
      },
      progress:
        progress.target !== null && !week
          ? progress.target > 0
            ? progress.current / progress.target
            : 1
          : undefined,
      week,
      onPress: () => setSheetHabitId(habit.id),
      control: {
        type: "add",
        done: progress.achieved,
        onPress: () => setSheetHabitId(habit.id),
        onLongPress: () => repeatLast(row),
      },
    };
  }

  const tabs = (
    <SegmentTabs
      label="記録の期間"
      value={view.period}
      items={PERIODS.map((p) => ({
        key: p,
        label: PERIOD_LABEL[p],
        count: tabCount(tabSummaries[p].done, tabSummaries[p].total),
        href: PERIOD_HREF[p],
      }))}
    />
  );

  if (summary.total === 0) {
    const noHabits = PERIODS.every((p) => tabSummaries[p].total === 0);
    return (
      <>
        <div className="px-screen-x mt-3">{tabs}</div>
        <RecordEmpty period={view.period} noHabits={noHabits} />
      </>
    );
  }

  const pending = summary.total - summary.done;

  return (
    <div className="px-screen-x">
      {view.grumble ? (
        <MascotSpeech
          expression={view.grumble.expression}
          meta={speechMeta(view.period, view.today, view.range, clock, pending)}
          className="mt-3"
        >
          {view.grumble.text}
        </MascotSpeech>
      ) : null}
      <SummaryCard
        className="mt-4"
        label={summaryLabel(view.period, view.today, view.range)}
        done={summary.done}
        total={summary.total}
        tags={
          view.highlight ? (
            <>
              <Tag>{view.highlight.tag}</Tag>
              <Tag variant="outline">{view.highlight.label}</Tag>
            </>
          ) : undefined
        }
        message={summaryMessage(view.period, summary.done, summary.total)}
      />
      <div className="mt-4">{tabs}</div>
      <HabitList className="mt-4" label={`${PERIOD_LABEL[view.period]}の習慣`}>
        {rows.map((row) => (
          <HabitRow key={row.habit.id} {...rowProps(row)} />
        ))}
      </HabitList>
      <QuantitySheet
        row={sheetRow}
        today={view.today}
        onClose={closeSheet}
        onSetTotal={setTotal}
        onAdd={addOnce}
        onDelete={deleteOnce}
      />
      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onAction={toast?.undo}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

const EMPTY_PERIOD: Record<
  Period,
  { title: string; description: string; action: string }
> = {
  daily: {
    title: "毎日の習慣はまだないよ",
    description: "「毎日 読書」のように、\n毎日続ける習慣を追加できます。",
    action: "毎日の習慣を追加",
  },
  weekly: {
    title: "週の習慣はまだないよ",
    description:
      "「週3回ランニング」のように、\n週ごとの回数で続ける習慣を追加できます。",
    action: "週の習慣を追加",
  },
  monthly: {
    title: "月の習慣はまだないよ",
    description:
      "「月1回 家計簿」のように、\n月ごとの回数で続ける習慣を追加できます。",
    action: "月の習慣を追加",
  },
};

/**
 * 空の状態：E1（習慣がまだない）／E2（その期間の習慣がない）。
 * Figma ではキャラ・文・ボタンのまとまりが本文の上下中央に来る。812 の高さで同じ位置になるよう上の余白を決めている
 */
function RecordEmpty({
  period,
  noHabits,
}: {
  period: Period;
  noHabits: boolean;
}) {
  if (noHabits) {
    return (
      <EmptyState
        className="mt-[80px]"
        expression="normal"
        mascotSize={250}
        title="まだ習慣がありません"
        description={
          "ぶら下がってるだけの毎日も、わるくないけど…。\nまずは1つ、登録してみよう。"
        }
        actions={
          <>
            <PillLink
              href="/habits/new"
              leading={<Icon name="plus" size={14} />}
            >
              習慣を追加する
            </PillLink>
            <EmptyStateLink href="/habits/presets">
              おすすめから選ぶ
            </EmptyStateLink>
          </>
        }
      />
    );
  }
  const text = EMPTY_PERIOD[period];
  return (
    <EmptyState
      className="mt-[118px]"
      expression="sleepy"
      mascotSize={190}
      title={text.title}
      description={text.description}
      actions={
        <PillLink
          href="/habits/new"
          variant="secondary"
          leading={<Icon name="plus" size={14} />}
        >
          {text.action}
        </PillLink>
      }
    />
  );
}
