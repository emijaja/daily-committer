/**
 * 記録（①、⑧）のユースケース。
 *
 * 「1日1行」（チェックのみ・合計を入力の習慣）は DB の部分一意インデックスが最終的に守る。
 * ここでは衝突先を指定した insert / upsert を使うので、同時に押されても2行にならず、エラーにもならない。
 * 記録と習慣の持ち主の一致は、複合外部キー entries_habit_fk が守る（習慣は必ず userId で絞って取得する）。
 */
import "server-only";
import { db } from "@/db/client";
import { evaluatePeriod, summarize } from "@/domain/achievement";
import {
  isInRange,
  periodRange,
  previousPeriodRange,
  toLogicalDate,
} from "@/domain/date";
import { selectGrumble } from "@/domain/grumble";
import { currentStreak } from "@/domain/streak";
import type {
  DateRange,
  Entry,
  Habit,
  LogicalDate,
  Period,
  WeekStart,
} from "@/domain/types";
import * as entriesRepo from "@/server/repositories/entries";
import * as habitsRepo from "@/server/repositories/habits";
import { toHabit, type HabitRecord } from "@/server/repositories/habits";
import { quantitySchema, quantityTotalSchema } from "@/server/validation";
import { hourIn } from "./clock";
import { entryNotFound, habitNotFound, ServiceError } from "./errors";
import { getSettings } from "./settings";
import type { RecordRow, RecordView, UserId } from "./types";

const PERIODS: readonly Period[] = ["daily", "weekly", "monthly"];

/** ①-a/b/c の表示用データ。now はテスト用に差し替えられる */
export async function getRecordView(
  userId: UserId,
  period: Period,
  now: Date = new Date(),
): Promise<RecordView> {
  const settings = await getSettings(userId);
  const today = toLogicalDate(now, settings.timezone, settings.dayStartHour);
  const ranges = Object.fromEntries(
    PERIODS.map((p) => [p, periodRange(p, today, settings.weekStart)]),
  ) as Record<Period, DateRange>;

  const habits = (await habitsRepo.listHabits(db, userId, "active")).map(
    toHabit,
  );
  // 連続記録の計算に過去の記録も要るので、現在の習慣の記録をすべて取得する
  // （習慣10個×数年でも数万行。architecture.md 4章「読み込みの量」）
  const entries = await entriesRepo.listEntries(db, userId, {
    habitIds: habits.map((h) => h.id),
  });
  const byHabit = groupByHabit(entries);

  const rowsByPeriod = Object.fromEntries(
    PERIODS.map((p) => [
      p,
      habits
        .filter((habit) => habit.period === p)
        .map((habit): RecordRow => {
          const all = byHabit.get(habit.id) ?? [];
          return {
            habit,
            progress: evaluatePeriod(habit, all, ranges[p]),
            entries: all.filter((e) => isInRange(e.date, ranges[p])),
            streak: streakOf(habit, all, today, settings.weekStart),
          };
        }),
    ]),
  ) as Record<Period, RecordRow[]>;
  const tabSummaries = Object.fromEntries(
    PERIODS.map((p) => [p, summarize(rowsByPeriod[p].map((r) => r.progress))]),
  ) as RecordView["tabSummaries"];

  const rows = rowsByPeriod[period];
  const grumble =
    settings.grumbleEnabled && rows.length > 0
      ? selectGrumble({
          period,
          progresses: rows.map((r) => r.progress),
          hour: hourIn(now, settings.timezone),
          today,
          habitNames: Object.fromEntries(
            rows.map((r) => [r.habit.id, r.habit.name]),
          ),
        })
      : null;

  return {
    period,
    today,
    range: ranges[period],
    rows,
    summary: tabSummaries[period],
    tabSummaries,
    grumble,
    highlight: highlightOf(rows),
  };
}

/** 行の連続記録。endedLastPeriod は「前の期間の時点で数えたら続いていた」 */
function streakOf(
  habit: Habit,
  entries: readonly Entry[],
  today: LogicalDate,
  weekStart: WeekStart,
): NonNullable<RecordRow["streak"]> {
  const current = currentStreak({ habit, entries, today, weekStart });
  if (current > 0) return { current, endedLastPeriod: false };
  // 前の期間を「進行中」として数えると、前の期間が未達成でもその前までの連続が数えられる
  const previous = previousPeriodRange(
    habit.period,
    periodRange(habit.period, today, weekStart),
    weekStart,
  ).end;
  const before = currentStreak({ habit, entries, today: previous, weekStart });
  return { current, endedLastPeriod: before > 0 };
}

/** 集計カードのタグを出す連続の下限 */
export const HIGHLIGHT_MIN_STREAK = 2;

/**
 * 集計カードのタグ（①-a「STREAK 6・読書 6日連続」など）。
 * その期間の習慣のうち、いまの連続が最も長いもの（同じなら並び順が先）を出す。
 * 連続が 2 未満なら null。
 * - 日次：STREAK 6 ・ 読書 6日連続
 * - 週次：4 WEEKS ・ ランニング 週10kmペース（チェックのみは「週3回ペース」）
 * - 月次：8 MONTHS ・ 家計簿 8か月連続
 */
export function highlightOf(
  rows: readonly RecordRow[],
): RecordView["highlight"] {
  let best: { habit: Habit; streak: number } | null = null;
  for (const row of rows) {
    const streak = row.streak?.current ?? 0;
    if (streak >= HIGHLIGHT_MIN_STREAK && (!best || streak > best.streak)) {
      best = { habit: row.habit, streak };
    }
  }
  if (!best) return null;
  const { habit, streak } = best;
  switch (habit.period) {
    case "daily":
      return {
        tag: `STREAK ${streak}`,
        label: `${habit.name} ${streak}日連続`,
      };
    case "weekly":
      return {
        tag: `${streak} WEEKS`,
        label: `${habit.name} ${weeklyPace(habit)}`,
      };
    case "monthly":
      return {
        tag: `${streak} MONTHS`,
        label: `${habit.name} ${streak}か月連続`,
      };
  }
}

/** 週次の習慣の「週3回ペース」「週10kmペース」 */
function weeklyPace(habit: Habit): string {
  if (habit.recordType === "check")
    return `週${habit.timesPerPeriod ?? 1}回ペース`;
  if (habit.quantityTarget !== null) {
    return `週${habit.quantityTarget}${habit.unit ?? ""}ペース`;
  }
  return "週1回以上ペース";
}

/** チェックのみの習慣の記録を付ける／外す。付けたら true */
export async function toggleCheck(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
): Promise<boolean> {
  const habit = await findHabitFor(userId, habitId, "check");
  return db.transaction(async (tx) => {
    // 先に消してみて、消せたら「外した」。なければ作る（同時に作られていたら何もしない）
    const deleted = await entriesRepo.deleteByHabitAndDate(
      tx,
      userId,
      habitId,
      date,
    );
    if (deleted > 0) return false;
    await entriesRepo.insertSingleIfAbsent(tx, userId, habit, date, null);
    return true;
  });
}

/** 「合計を入力」の習慣の、その日の合計を上書きする。0 なら記録を削除 */
export async function setQuantityTotal(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
  quantity: number,
): Promise<void> {
  if (!quantityTotalSchema.safeParse(quantity).success) throw invalidQuantity();
  const habit = await findHabitFor(userId, habitId, "total");
  if (quantity === 0) {
    await entriesRepo.deleteByHabitAndDate(db, userId, habitId, date);
    return;
  }
  await entriesRepo.upsertSingle(db, userId, habit, date, quantity);
}

/** 「回ごとに足す」の習慣に1回分を追加する。追加した記録の ID を返す */
export async function addQuantity(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
  quantity: number,
): Promise<string> {
  if (!quantitySchema.safeParse(quantity).success) throw invalidQuantity();
  const habit = await findHabitFor(userId, habitId, "increment");
  return entriesRepo.insertEntry(db, userId, habit, date, quantity);
}

/**
 * ＋の長押し：前回と同じ量で記録する。取り消し用に記録の ID を返す。
 * - 回ごとに足す：前回の1回分と同じ量を1行追加する
 * - 合計を入力：その日の記録がまだないときだけ、前回の合計と同じ量で記録する。
 *   すでにあるときは上書きせずエラーにする（取り消しで元の合計を消してしまわないため）
 */
export async function repeatLastQuantity(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
): Promise<{ entryId: string; quantity: number }> {
  const habit = await findHabitFor(userId, habitId, "quantity");
  const quantity = await entriesRepo.findLatestQuantity(db, userId, habitId);
  if (quantity === null || quantity <= 0) {
    throw new ServiceError("invalid", "前回の記録がありません");
  }
  if (habit.multiplePerDay) {
    const entryId = await entriesRepo.insertEntry(
      db,
      userId,
      habit,
      date,
      quantity,
    );
    return { entryId, quantity };
  }
  const entryId = await entriesRepo.insertSingleIfAbsent(
    db,
    userId,
    habit,
    date,
    quantity,
  );
  if (!entryId) {
    throw new ServiceError("conflict", "この日の記録はすでにあります");
  }
  return { entryId, quantity };
}

/** 記録を1件削除する（取り消し、⑧-b の明細の削除） */
export async function deleteEntry(
  userId: UserId,
  entryId: string,
): Promise<void> {
  const deleted = await entriesRepo.deleteEntry(db, userId, entryId);
  if (!deleted) throw entryNotFound();
}

// ── 内部 ─────────────────────────────

type HabitKind = "check" | "quantity" | "total" | "increment";

/** 自分の習慣を取得し、操作に合った種類かを確かめる */
async function findHabitFor(
  userId: UserId,
  habitId: string,
  kind: HabitKind,
): Promise<HabitRecord> {
  const habit = await habitsRepo.findHabit(db, userId, habitId);
  if (!habit) throw habitNotFound();
  const ok =
    kind === "check"
      ? habit.recordType === "check"
      : kind === "quantity"
        ? habit.recordType === "quantity"
        : habit.recordType === "quantity" && habit.inputMode === kind;
  if (!ok) {
    throw new ServiceError("invalid", "この習慣では使えない記録のしかたです");
  }
  return habit;
}

const invalidQuantity = () =>
  new ServiceError("invalid", "量の値が正しくありません");

function groupByHabit(entries: readonly Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = map.get(entry.habitId);
    if (list) list.push(entry);
    else map.set(entry.habitId, [entry]);
  }
  return map;
}
