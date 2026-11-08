"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarModal } from "@/components/CalendarModal";
import { cx, HIT_AREA } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { GrassCard } from "@/components/GrassHeatmap";
import { Icon } from "@/components/icons";
import { Marker } from "@/components/Marker";
import { SectionHeading } from "@/components/SectionHeading";
import { SegmentTabs } from "@/components/SegmentTabs";
import { MascotSpeech } from "@/components/Speech";
import { StatBox, StatMoreBox } from "@/components/StatBox";
import { daysBetween, periodRange, splitDate } from "@/domain/date";
import type { ReviewItem } from "@/domain/review";
import type { Habit, LogicalDate, TextSegment } from "@/domain/types";
import type { ReviewView } from "@/server/services/types";

/** ⑥-a に出す「達成していること」の数（残りは「ほか ◯件 すべて見る」） */
const TOP_ACHIEVEMENTS = 3;

type Tab = "all" | "habit";

/** ⑥-a 振り返り ＋ ⑥-b 日付を選ぶ（モーダル） */
export function ReviewScreen({ view }: { view: ReviewView }) {
  const router = useRouter();
  const [thisYear, thisMonth] = splitDate(view.today);
  const firstYear = view.firstRecordDate
    ? splitDate(view.firstRecordDate)[0]
    : thisYear;
  const isEmpty = view.firstRecordDate === null;
  const habitsById = new Map(view.habits.map((h) => [h.id, h]));
  const selectedHabit = view.habitId ? habitsById.get(view.habitId) : null;

  const href = (year: number, habitId: string | null) =>
    habitId
      ? `/review?year=${year}&habit=${encodeURIComponent(habitId)}`
      : `/review?year=${year}`;

  // ⑥-b：開いている月（null なら閉じている）。その年の中だけを行き来する
  const [calendarMonth, setCalendarMonth] = useState<number | null>(null);
  const lastMonth = view.year === thisYear ? thisMonth : 12;
  const openDay = (date: LogicalDate) => {
    setCalendarMonth(null);
    router.push(`/review/${date}`);
  };

  return (
    <div className="mt-3">
      <SegmentTabs<Tab>
        label="草の表示"
        className="px-screen-x"
        value={view.habitId ? "habit" : "all"}
        items={[
          { key: "all", label: "すべての習慣", href: href(view.year, null) },
          {
            key: "habit",
            label: "習慣ごと",
            href: href(view.year, view.habitId ?? view.habits[0]?.id ?? null),
          },
        ]}
      />

      {view.habitId ? (
        <HabitChips
          habits={view.habits}
          selected={view.habitId}
          hrefFor={(id) => href(view.year, id)}
        />
      ) : null}

      <div className="px-screen-x mt-4">
        <GrassCard
          year={view.year}
          summary={
            selectedHabit
              ? `${selectedHabit.name}の記録 ${view.recordCount}日`
              : `記録 ${view.recordCount}件`
          }
          cells={view.grass}
          weekStart={view.weekStart}
          today={view.today}
          highlightToday={isEmpty}
          legend={isEmpty ? "none" : view.habitId ? "binary" : "levels"}
          hint={
            isEmpty ? (
              <Marker>今日の記録から、ここに草が生えます</Marker>
            ) : undefined
          }
          onPrev={
            isEmpty
              ? undefined
              : () => router.push(href(view.year - 1, view.habitId))
          }
          onNext={
            isEmpty
              ? undefined
              : () => router.push(href(view.year + 1, view.habitId))
          }
          canPrev={view.year > firstYear}
          canNext={view.year < thisYear}
          onCellPress={
            isEmpty ? undefined : (date) => setCalendarMonth(splitDate(date)[1])
          }
        />
      </div>

      {isEmpty ? (
        <EmptyState
          expression="sleepy"
          mascotSize={170}
          className="mt-14"
          title="まだ何もないね…。ぼくといっしょ。"
          description={
            "記録が3日たまると「達成していること」と\n「もう少しで達成」がここに並びます。"
          }
          actions={
            <Link
              href="/record/today"
              className={cx(
                "text-[13px] font-bold underline underline-offset-4",
                HIT_AREA,
              )}
            >
              記録画面へ
            </Link>
          }
        />
      ) : (
        <>
          {view.grumble ? (
            <MascotSpeech
              form="icon"
              expression={view.grumble.expression}
              className="px-screen-x mt-4"
            >
              {view.grumble.text}
            </MascotSpeech>
          ) : null}
          <Achievements items={view.achievements} habitsById={habitsById} />
          <AlmostThere
            items={view.almostThere}
            habitsById={habitsById}
            today={view.today}
            weekStart={view.weekStart}
          />
        </>
      )}

      <CalendarModal
        open={calendarMonth !== null}
        year={view.year}
        month={calendarMonth ?? 1}
        cells={view.grass}
        weekStart={view.weekStart}
        today={view.today}
        onSelect={openDay}
        onPrev={() => setCalendarMonth((m) => (m === null ? m : m - 1))}
        onNext={() => setCalendarMonth((m) => (m === null ? m : m + 1))}
        canPrev={(calendarMonth ?? 1) > 1}
        canNext={(calendarMonth ?? 12) < lastMonth}
        onClose={() => setCalendarMonth(null)}
        onToday={() => openDay(view.today)}
      />
    </div>
  );
}

/** 「習慣ごと」で表示する習慣を選ぶチップ（横にスクロール） */
function HabitChips({
  habits,
  selected,
  hrefFor,
}: {
  habits: readonly Habit[];
  selected: string;
  hrefFor: (habitId: string) => string;
}) {
  return (
    <nav
      aria-label="表示する習慣"
      className="px-screen-x mt-3 flex gap-2 overflow-x-auto pb-1"
    >
      {habits.map((habit) => {
        const isSelected = habit.id === selected;
        return (
          <Link
            key={habit.id}
            href={hrefFor(habit.id)}
            aria-current={isSelected ? "page" : undefined}
            className={cx(
              "frame flex h-8 shrink-0 items-center px-3 text-[12px] font-bold whitespace-nowrap",
              isSelected ? "bg-black text-white" : "bg-white text-black",
              habit.archivedOn !== null && !isSelected && "text-gray-500",
            )}
          >
            {habit.name}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * 達成していることの数字の箱の中身。
 * 週次・月次のペースはデザインに合わせて「週3回」を大きく出し、連続の期間数は下の文に入れる
 */
function statOf(item: ReviewItem, habit: Habit | undefined) {
  const { value, unit } = item.figure;
  if (item.kind === "overTargetStreak") {
    return { value, unit, caption: "目標超えが連続" };
  }
  if (item.kind === "periodPace" && habit && habit.period !== "daily") {
    const prefix = habit.period === "weekly" ? "週" : "月";
    const caption = `ペースで継続中 ・ ${value}${unit}連続`;
    if (habit.recordType === "check") {
      return { prefix, value: habit.timesPerPeriod ?? 1, unit: "回", caption };
    }
    if (habit.quantityTarget !== null) {
      return {
        prefix,
        value: habit.quantityTarget,
        unit: habit.unit ?? "",
        caption,
      };
    }
    return { value, unit, caption: "連続で達成中" };
  }
  return { value, unit, caption: "連続で継続中" };
}

function Achievements({
  items,
  habitsById,
}: {
  items: readonly ReviewItem[];
  habitsById: ReadonlyMap<string, Habit>;
}) {
  const [showAll, setShowAll] = useState(false);
  const hidden = items.length - TOP_ACHIEVEMENTS;
  const shown =
    showAll || hidden <= 0 ? items : items.slice(0, TOP_ACHIEVEMENTS);
  return (
    <section className="px-screen-x mt-6">
      <SectionHeading title="達成していること" />
      {items.length === 0 ? (
        <p className="text-body mt-2 text-gray-500">
          3日続くと、ここに並びます。
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {shown.map((item) => {
            const habit = habitsById.get(item.habitId);
            return (
              <StatBox
                key={item.habitId}
                label={habit?.name ?? ""}
                {...statOf(item, habit)}
              />
            );
          })}
          {!showAll && hidden > 0 ? (
            <StatMoreBox
              label={`ほか ${hidden}件`}
              onPress={() => setShowAll(true)}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function Segments({ segments }: { segments: readonly TextSegment[] }) {
  return segments.map((s, i) =>
    s.emphasis ? (
      <span key={i} className="font-black">
        {s.text}
      </span>
    ) : (
      <span key={i}>{s.text}</span>
    ),
  );
}

const PERIOD_LABEL = { daily: "日次", weekly: "週次", monthly: "月次" };
const CURRENT_LABEL = { weekly: "今週", monthly: "今月" };

/** 行の下の小さな文：「日次」「週次 ・ 今週の残り2日」 */
function metaOf(
  habit: Habit | undefined,
  today: LogicalDate,
  weekStart: ReviewView["weekStart"],
): string {
  if (!habit) return "";
  if (habit.period === "daily") return PERIOD_LABEL.daily;
  const range = periodRange(habit.period, today, weekStart);
  const left = daysBetween(today, range.end);
  const rest =
    left === 0
      ? `${CURRENT_LABEL[habit.period]}は今日まで`
      : `${CURRENT_LABEL[habit.period]}の残り${left}日`;
  return `${PERIOD_LABEL[habit.period]} ・ ${rest}`;
}

function AlmostThere({
  items,
  habitsById,
  today,
  weekStart,
}: {
  items: readonly ReviewItem[];
  habitsById: ReadonlyMap<string, Habit>;
  today: LogicalDate;
  weekStart: ReviewView["weekStart"];
}) {
  return (
    <section className="px-screen-x mt-6">
      <SectionHeading title="もう少しで達成" />
      {items.length === 0 ? (
        <p className="text-body mt-2 text-gray-500">
          いまは、もう少しのものはありません。
        </p>
      ) : (
        <ul className="frame mt-3 bg-white">
          {items.map((item, i) => (
            <li
              key={item.habitId}
              className={cx(i > 0 && "border-t-[1.5px] border-black")}
            >
              <Link
                href={`/habits/${item.habitId}`}
                className="flex min-h-14 items-center gap-3 px-3 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="bg-yellow flex size-7 shrink-0 items-center justify-center rounded-full"
                >
                  <Icon name="target" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] leading-[17px] font-bold">
                    <Segments segments={item.segments} />
                  </span>
                  <span className="mt-0.5 block text-[9px] font-medium text-gray-500">
                    {metaOf(habitsById.get(item.habitId), today, weekStart)}
                  </span>
                </span>
                <Icon name="chevron-right" size={14} strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
