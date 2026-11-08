"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { CalendarModal } from "@/components/CalendarModal";
import { EmptyState } from "@/components/EmptyState";
import { HabitList, HabitRow, type HabitRowProps } from "@/components/HabitRow";
import { Marker } from "@/components/Marker";
import { PillLink } from "@/components/Pill";
import { formatQuantity } from "@/components/quantity";
import { SectionHeading } from "@/components/SectionHeading";
import { Toast } from "@/components/Toast";
import { evaluatePeriod, summarize } from "@/domain/achievement";
import { addDays, splitDate } from "@/domain/date";
import type { LogicalDate } from "@/domain/types";
import {
  addQuantityAction,
  deleteEntryAction,
  repeatLastQuantityAction,
  setQuantityTotalAction,
  toggleCheckAction,
} from "@/server/actions/record";
import type {
  ActionResult,
  DayEditView,
  RecordRow,
} from "@/server/services/types";
import { QuantitySheet } from "../../record/quantity-sheet";
import {
  dowLabel,
  jaDate,
  quantityOn,
  shortDate,
} from "../../record/record-format";
import {
  applyRecordOp,
  entriesByHabit,
  type EntriesByHabit,
  type RecordOp,
} from "../../record/record-optimistic";
import {
  dayEditCaption,
  dayEditWeekDays,
  monthHeading,
  weekHeading,
} from "./day-edit-format";
import { DateNav } from "./date-nav";

interface ToastState {
  key: number;
  message: string;
  undo?: () => void;
}

/** 量のシートを開いている習慣と、記録する日（週次の曜日から開くと選んだ日と違うことがある） */
interface SheetState {
  habitId: string;
  date: LogicalDate;
}

/** 書き換えた記録から、行の進み具合を計算し直す（期間は行ごとに決まっている） */
function recomputeRows(
  rows: readonly RecordRow[],
  state: EntriesByHabit,
): RecordRow[] {
  return rows.map((row) => {
    const entries = [...(state[row.habit.id] ?? [])];
    return {
      ...row,
      entries,
      progress: evaluatePeriod(row.habit, entries, row.progress.range),
    };
  });
}

const countOf = (rows: readonly RecordRow[]) => {
  const { done, total } = summarize(rows.map((r) => r.progress));
  return `${done} / ${total}`;
};

/**
 * ② 記録の確認・修正の本体。過去の日の記録を付ける・外す・量を直す。
 * ① と同じく、記録を楽観的に書き換えてから Server Action を呼ぶ（失敗したら元に戻してトースト）。
 */
export function DayEditScreen({ view }: { view: DayEditView }) {
  const router = useRouter();
  const { date, today } = view;
  const allRows = useMemo(
    () => [...view.daily, ...view.weekly.rows, ...view.monthly.rows],
    [view],
  );
  const base = useMemo(() => entriesByHabit(allRows), [allRows]);
  const [entries, applyOptimistic] = useOptimistic(base, applyRecordOp);
  const daily = useMemo(
    () => recomputeRows(view.daily, entries),
    [view.daily, entries],
  );
  const weekly = useMemo(
    () => recomputeRows(view.weekly.rows, entries),
    [view.weekly.rows, entries],
  );
  const monthly = useMemo(
    () => recomputeRows(view.monthly.rows, entries),
    [view.monthly.rows, entries],
  );
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const sheetRow =
    [...daily, ...weekly, ...monthly].find(
      (r) => r.habit.id === sheet?.habitId,
    ) ?? null;
  const closeSheet = useCallback(() => setSheet(null), []);

  // カレンダー（⑥-b と同じ）。開いている月。null なら閉じている
  const [calendar, setCalendar] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [firstYear, firstMonth] = splitDate(view.calendar.range.start);
  const [todayYear, todayMonth] = splitDate(today);
  const monthIndex = (c: { year: number; month: number }) =>
    c.year * 12 + c.month;
  const openCalendar = () => {
    const [year, month] = splitDate(date);
    setCalendar({ year, month });
  };
  const shiftCalendar = (delta: number) =>
    setCalendar((c) => {
      if (!c) return c;
      const n = c.year * 12 + (c.month - 1) + delta;
      return { year: Math.floor(n / 12), month: (n % 12) + 1 };
    });
  const openDay = (day: LogicalDate) => {
    setCalendar(null);
    if (day !== date) router.push(`/review/${day}`);
  };

  const showToast = (message: string, undo?: () => void) =>
    setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message, undo }));

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

  /** チェックのみの習慣：day の記録を付ける／外す。週次・月次は期間の達成と一致しないのでトーストで知らせる */
  function toggle(row: RecordRow, day: LogicalDate, withToast: boolean) {
    const habitId = row.habit.id;
    mutate(
      { type: "toggle", habitId, date: day },
      () => toggleCheckAction({ habitId, date: day }),
      (data) => {
        if (!withToast) return;
        showToast(
          `${row.habit.name}：${jaDate(day)}の分を${data.checked ? "記録" : "取り消し"}しました`,
          () => {
            setToast(null);
            mutate({ type: "toggle", habitId, date: day }, () =>
              toggleCheckAction({ habitId, date: day }),
            );
          },
        );
      },
    );
  }

  const quantityToast = (row: RecordRow, quantity: number, verb: string) =>
    `${row.habit.name} ${formatQuantity(quantity)} ${row.habit.unit ?? ""}${verb}`;

  /** ＋の長押し：前回と同じ量で選んだ日に記録する（① と同じ。合計がもうあればシートを開く） */
  function repeatLast(row: RecordRow) {
    const { habit } = row;
    if (
      habit.inputMode === "total" &&
      quantityOn(row.entries ?? [], date) > 0
    ) {
      setSheet({ habitId: habit.id, date });
      return;
    }
    mutate(
      null,
      () => repeatLastQuantityAction({ habitId: habit.id, date }),
      ({ entryId, quantity }) =>
        showToast(quantityToast(row, quantity, "を記録しました"), () => {
          setToast(null);
          deleteEntry(entryId);
        }),
    );
  }

  function setTotal(row: RecordRow, quantity: number) {
    if (!sheet) return;
    const habitId = row.habit.id;
    const day = sheet.date;
    mutate({ type: "setTotal", habitId, date: day, quantity }, () =>
      setQuantityTotalAction({ habitId, date: day, quantity }),
    );
  }

  function addOnce(row: RecordRow, quantity: number) {
    if (!sheet) return;
    const habitId = row.habit.id;
    const day = sheet.date;
    setSheet(null);
    mutate(
      { type: "add", habitId, date: day, quantity },
      () => addQuantityAction({ habitId, date: day, quantity }),
      ({ entryId }) =>
        showToast(quantityToast(row, quantity, "を記録しました"), () => {
          setToast(null);
          deleteEntry(entryId);
        }),
    );
  }

  function deleteOnce(row: RecordRow, entryId: string) {
    const entry = row.entries?.find((e) => e.id === entryId);
    if (!entry) return;
    const habitId = row.habit.id;
    const quantity = entry.quantity ?? 0;
    mutate(
      { type: "delete", entryId },
      () => deleteEntryAction({ entryId }),
      () =>
        showToast(quantityToast(row, quantity, "の記録を削除しました"), () => {
          setToast(null);
          mutate({ type: "add", habitId, date: entry.date, quantity }, () =>
            addQuantityAction({ habitId, date: entry.date, quantity }),
          );
        }),
    );
  }

  function rowProps(row: RecordRow): HabitRowProps {
    const { habit, progress } = row;
    const caption = dayEditCaption(habit, progress);
    const isQuantity = habit.recordType === "quantity";
    const openSheet = (day: LogicalDate) =>
      setSheet({ habitId: habit.id, date: day });
    const week =
      habit.period === "weekly"
        ? {
            days: dayEditWeekDays(
              progress.range,
              date,
              today,
              habit.createdOn,
              progress.recordedDates,
            ),
            onDayPress: (i: number) => {
              const day = addDays(progress.range.start, i);
              if (isQuantity) openSheet(day);
              else toggle(row, day, false);
            },
          }
        : undefined;

    if (!isQuantity) {
      const target = progress.target ?? 1;
      if (habit.period === "daily") {
        return {
          name: habit.name,
          caption,
          control: {
            type: "check",
            checked: progress.achieved,
            onChange: () => toggle(row, date, false),
          },
        };
      }
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
                onPress: () => toggle(row, date, true),
              }
            : {
                type: "check",
                checked: progress.achieved,
                onChange: () => toggle(row, date, true),
              },
      };
    }

    const unit = habit.unit ?? "";
    const showTarget = habit.period !== "daily" && progress.target !== null;
    return {
      name: habit.name,
      caption,
      amount: {
        value: formatQuantity(progress.current),
        target:
          showTarget && progress.target !== null
            ? formatQuantity(progress.target)
            : undefined,
        unit,
      },
      progress:
        habit.period === "monthly" && progress.target !== null
          ? progress.target > 0
            ? progress.current / progress.target
            : 1
          : undefined,
      week,
      onPress: () => openSheet(date),
      control: {
        type: "add",
        done: progress.achieved,
        onPress: () => openSheet(date),
        onLongPress: () => repeatLast(row),
      },
    };
  }

  const calendarModal = (
    <CalendarModal
      open={calendar !== null}
      year={calendar?.year ?? todayYear}
      month={calendar?.month ?? todayMonth}
      cells={view.calendar.grass}
      weekStart={view.weekStart}
      today={today}
      selected={date}
      onSelect={openDay}
      onPrev={() => shiftCalendar(-1)}
      onNext={() => shiftCalendar(1)}
      canPrev={
        calendar !== null &&
        monthIndex(calendar) >
          monthIndex({ year: firstYear, month: firstMonth })
      }
      canNext={
        calendar !== null &&
        monthIndex(calendar) <
          monthIndex({ year: todayYear, month: todayMonth })
      }
      onClose={() => setCalendar(null)}
      onToday={() => openDay(today)}
    />
  );

  const nav = (
    <DateNav
      date={date}
      prevHref={
        view.startDate !== null && date > view.startDate
          ? `/review/${addDays(date, -1)}`
          : null
      }
      nextHref={date < today ? `/review/${addDays(date, 1)}` : null}
      onPick={openCalendar}
    />
  );

  if (view.beforeStart) {
    return (
      <div className="px-screen-x">
        {nav}
        <BeforeStart view={view} />
        {calendarModal}
      </div>
    );
  }

  const hasRows = daily.length + weekly.length + monthly.length > 0;

  return (
    <div className="px-screen-x">
      {nav}
      {!hasRows ? (
        <EmptyState
          className="mt-16"
          expression="sleepy"
          mascotSize={180}
          title="この日の習慣はありません"
          description="この日に続けていた習慣はありません。"
        />
      ) : null}
      {daily.length > 0 ? (
        <section className="mt-5">
          <SectionHeading tag="DAILY" title="この日" count={countOf(daily)} />
          <HabitList className="mt-2.5" label="この日の習慣">
            {daily.map((row) => (
              <HabitRow key={row.habit.id} {...rowProps(row)} />
            ))}
          </HabitList>
        </section>
      ) : null}
      {weekly.length > 0 ? (
        <section className="mt-5">
          <SectionHeading
            tag="WEEKLY"
            title={weekHeading(view.weekly.range)}
            count={countOf(weekly)}
          />
          <HabitList className="mt-2.5" label="この週の習慣">
            {weekly.map((row) => (
              <HabitRow key={row.habit.id} {...rowProps(row)} />
            ))}
          </HabitList>
        </section>
      ) : null}
      {monthly.length > 0 ? (
        <section className="mt-5">
          <SectionHeading
            tag="MONTHLY"
            title={monthHeading(date)}
            count={countOf(monthly)}
          />
          <HabitList className="mt-2.5" label="この月の習慣">
            {monthly.map((row) => (
              <HabitRow key={row.habit.id} {...rowProps(row)} />
            ))}
          </HabitList>
        </section>
      ) : null}
      {weekly.length + monthly.length > 0 ? (
        <p className="text-caption mt-4">
          <Marker>週次は曜日を、月次は回数をタップして修正します</Marker>
        </p>
      ) : null}

      <QuantitySheet
        row={sheetRow}
        today={sheet?.date ?? date}
        addLabel={
          sheet && sheet.date !== today
            ? `${shortDate(sheet.date)}（${dowLabel(sheet.date)}）の分を追加`
            : undefined
        }
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
      {calendarModal}
    </div>
  );
}

/** E4：習慣を始める前の日。習慣が1つもなければ、習慣の追加へ案内する */
function BeforeStart({ view }: { view: DayEditView }) {
  const first = view.firstRecordDate ?? view.startDate;
  if (first === null) {
    return (
      <EmptyState
        className="mt-16"
        expression="sleepy"
        mascotSize={180}
        title="まだ習慣がありません"
        description={"習慣を追加すると、\nここで記録を確認・修正できます。"}
        actions={
          <PillLink href="/habits/new" variant="secondary">
            ＋ 習慣を追加する
          </PillLink>
        }
      />
    );
  }
  const lead =
    view.firstRecordDate !== null
      ? `いちばん古い記録は ${jaDate(view.firstRecordDate)}から。`
      : `習慣を始めたのは ${jaDate(first)}から。`;
  return (
    <EmptyState
      className="mt-16"
      expression="sleepy"
      mascotSize={180}
      title="この日は、まだ習慣を始める前です"
      description={`${lead}\nこの日はぼくと同じく、のんびりしてた日。`}
      actions={
        <PillLink href={`/review/${first}`} variant="secondary" block>
          {view.firstRecordDate !== null ? "最初の記録の日へ" : "始めた日へ"}
        </PillLink>
      }
    />
  );
}
