"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { cx, HIT_AREA } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { HabitList } from "@/components/HabitRow";
import { Icon } from "@/components/icons";
import { Pill, PillLink } from "@/components/Pill";
import { SectionHeading } from "@/components/SectionHeading";
import { SegmentTabs } from "@/components/SegmentTabs";
import { Toast } from "@/components/Toast";
import type { Habit } from "@/domain/types";
import {
  reorderHabitsAction,
  restoreHabitAction,
} from "@/server/actions/habits";
import type { HabitListView } from "@/server/services/types";
import {
  formatJapaneseDate,
  habitCaption,
  PERIOD_LABEL,
  PERIOD_TAG,
} from "./habit-text";

type ListState = Pick<HabitListView, "counts" | "groups">;

type OptimisticAction =
  | { type: "move"; habitId: string; offset: -1 | 1 }
  | { type: "restore"; habitId: string };

/** 並べ替え・戻すを、サーバーの結果を待たずに一覧へ反映する */
function applyAction(state: ListState, action: OptimisticAction): ListState {
  if (action.type === "move") {
    return {
      ...state,
      groups: state.groups.map((group) => {
        const index = group.habits.findIndex((h) => h.id === action.habitId);
        const target = index + action.offset;
        if (index < 0 || target < 0 || target >= group.habits.length) {
          return group;
        }
        const habits = [...group.habits];
        [habits[index], habits[target]] = [habits[target]!, habits[index]!];
        return { ...group, habits };
      }),
    };
  }
  if (action.type === "restore") {
    return {
      counts: {
        active: state.counts.active + 1,
        archived: Math.max(0, state.counts.archived - 1),
      },
      groups: state.groups
        .map((group) => ({
          ...group,
          habits: group.habits.filter((h) => h.id !== action.habitId),
        }))
        .filter((group) => group.habits.length > 0),
    };
  }
  return state;
}

/** ④ の上部タブから下。並べ替えと「戻す」は楽観的に更新し、失敗したらトーストで知らせる */
export function HabitListScreen({ view }: { view: HabitListView }) {
  const [state, apply] = useOptimistic<ListState, OptimisticAction>(
    { counts: view.counts, groups: view.groups },
    applyAction,
  );
  const [, startTransition] = useTransition();
  const [sorting, setSorting] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  // 続けて出すときは key を変えて、表示の時間を数え直す
  const showToast = (message: string) =>
    setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message }));

  const isActive = view.status === "active";
  const habitTotal = state.groups.reduce((n, g) => n + g.habits.length, 0);
  const canSort = isActive && habitTotal > 1;

  const move = (groupHabits: Habit[], habitId: string, offset: -1 | 1) => {
    const index = groupHabits.findIndex((h) => h.id === habitId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= groupHabits.length) return;
    const ids = groupHabits.map((h) => h.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    startTransition(async () => {
      apply({ type: "move", habitId, offset });
      const result = await reorderHabitsAction({ orderedIds: ids });
      if (!result.ok) showToast(result.error);
    });
  };

  const restore = (habit: Habit) => {
    startTransition(async () => {
      apply({ type: "restore", habitId: habit.id });
      const result = await restoreHabitAction({ habitId: habit.id });
      showToast(
        result.ok ? `${habit.name}を現在の習慣に戻しました` : result.error,
      );
    });
  };

  return (
    <>
      <div className="px-screen-x mt-3 flex items-start justify-between">
        <SegmentTabs
          label="習慣の種類"
          value={view.status}
          items={[
            {
              key: "active",
              label: "現在の習慣",
              count: state.counts.active,
              href: "/habits",
            },
            {
              key: "archived",
              label: "過去の習慣",
              count: state.counts.archived,
              href: "/habits?tab=archived",
            },
          ]}
        />
        {canSort ? (
          <button
            type="button"
            aria-pressed={sorting}
            onClick={() => setSorting((s) => !s)}
            className={cx(
              "text-[12px] leading-4 font-bold underline underline-offset-2",
              HIT_AREA,
            )}
          >
            {sorting ? "完了" : "並べ替え"}
          </button>
        ) : null}
      </div>

      {state.groups.length === 0 ? (
        isActive ? (
          <EmptyState
            className="mt-10"
            mascotSize={180}
            title="まだ習慣がありません"
            description={"右上の ＋ から、続けたい習慣を\n追加しましょう。"}
            actions={
              <PillLink href="/habits/new" leading={<Icon name="plus" />}>
                習慣を追加する
              </PillLink>
            }
          />
        ) : (
          <EmptyState
            className="mt-12"
            expression={null}
            title="過去の習慣はありません"
            description={
              "習慣の編集で「過去の習慣にする」と、ここに移ります。\n記録と草は残ります。"
            }
          />
        )
      ) : (
        <div className="px-screen-x mt-5 space-y-5">
          {sorting ? (
            <p className="text-caption text-gray-500">
              ↑↓ で、同じ周期の中の順番を入れ替えます
            </p>
          ) : null}
          {state.groups.map((group) => (
            <section key={group.period}>
              <SectionHeading
                tag={PERIOD_TAG[group.period]}
                title={PERIOD_LABEL[group.period]}
                count={group.habits.length}
              />
              <HabitList className="mt-2.5" label={PERIOD_LABEL[group.period]}>
                {group.habits.map((habit, index) => (
                  <ManageRow
                    key={habit.id}
                    habit={habit}
                    status={view.status}
                    sorting={sorting}
                    isFirst={index === 0}
                    isLast={index === group.habits.length - 1}
                    onMove={(offset) => move(group.habits, habit.id, offset)}
                    onRestore={() => restore(habit)}
                  />
                ))}
              </HabitList>
            </section>
          ))}
        </div>
      )}

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </>
  );
}

function ManageRow({
  habit,
  status,
  sorting,
  isFirst,
  isLast,
  onMove,
  onRestore,
}: {
  habit: Habit;
  status: HabitListView["status"];
  sorting: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (offset: -1 | 1) => void;
  onRestore: () => void;
}) {
  const caption =
    status === "archived" && habit.archivedOn
      ? `${formatJapaneseDate(habit.archivedOn)}から過去の習慣 ・ ${habitCaption(habit)}`
      : habitCaption(habit);
  const text = (
    <>
      <span className="text-row-title block truncate leading-[17px]">
        {habit.name}
      </span>
      <span className="text-caption mt-0.5 block truncate leading-3 text-gray-500">
        {caption}
      </span>
    </>
  );

  if (sorting) {
    return (
      <li className="px-row-x py-row-y flex items-center gap-3">
        <div className="min-w-0 flex-1">{text}</div>
        <div className="flex shrink-0 gap-2">
          <SortButton
            label={`${habit.name}を上へ`}
            disabled={isFirst}
            onClick={() => onMove(-1)}
          />
          <SortButton
            label={`${habit.name}を下へ`}
            disabled={isLast}
            onClick={() => onMove(1)}
            down
          />
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center">
      <Link
        href={`/habits/${habit.id}`}
        className="px-row-x flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2"
      >
        <div className="min-w-0 flex-1">{text}</div>
        {status === "active" ? (
          <Icon name="chevron-right" size={16} className="shrink-0" />
        ) : null}
      </Link>
      {status === "archived" ? (
        <Pill
          variant="secondary"
          size="sm"
          onClick={onRestore}
          className="mr-row-x"
          aria-label={`${habit.name}を現在の習慣に戻す`}
        >
          戻す
        </Pill>
      ) : null}
    </li>
  );
}

function SortButton({
  label,
  disabled,
  onClick,
  down,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  down?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="frame flex size-9 items-center justify-center bg-white disabled:opacity-30"
    >
      <Icon
        name="chevron-up"
        size={16}
        className={down ? "rotate-180" : undefined}
      />
    </button>
  );
}
