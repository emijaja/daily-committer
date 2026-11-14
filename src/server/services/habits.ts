import "server-only";
import { db } from "@/db/client";
import type { Habit, Period } from "@/domain/types";
import * as entriesRepo from "@/server/repositories/entries";
import * as habitsRepo from "@/server/repositories/habits";
import { toHabit, type HabitValues } from "@/server/repositories/habits";
import {
  habitInputSchema,
  idSchema,
  presetNamesSchema,
} from "@/server/validation";
import { getToday } from "./clock";
import { habitNotFound, ServiceError } from "./errors";
import type { HabitInput, HabitListView, UserId } from "./types";

const PERIOD_ORDER: readonly Period[] = ["daily", "weekly", "monthly"];

function parseHabitInput(input: HabitInput): HabitValues {
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ServiceError(
      "invalid",
      first?.code === "custom" ? first.message : "習慣の入力が正しくありません",
    );
  }
  return parsed.data;
}

/** 習慣の一覧（④）。周期ごとに、習慣のある周期だけをまとめる */
export async function getHabitList(
  userId: UserId,
  status: "active" | "archived",
): Promise<HabitListView> {
  const [records, counts] = await Promise.all([
    habitsRepo.listHabits(db, userId, status),
    habitsRepo.countHabits(db, userId),
  ]);
  const habits = records.map(toHabit);
  const groups = PERIOD_ORDER.map((period) => ({
    period,
    habits: habits.filter((h) => h.period === period),
  })).filter((group) => group.habits.length > 0);
  return { status, counts, groups };
}

/** 現在の習慣の名前（O5・おすすめから選ぶで「登録済み」を出すため） */
export async function getActiveHabitNames(userId: UserId): Promise<string[]> {
  const records = await habitsRepo.listHabits(db, userId, "active");
  return records.map((h) => h.name);
}

export async function getHabit(
  userId: UserId,
  habitId: string,
): Promise<Habit | null> {
  const record = await habitsRepo.findHabit(db, userId, habitId);
  return record ? toHabit(record) : null;
}

/** 習慣を追加する。作った日はサーバーで決めた今日、並び順はいちばん後ろ */
export async function createHabit(
  userId: UserId,
  input: HabitInput,
  now: Date = new Date(),
): Promise<Habit> {
  const values = parseHabitInput(input);
  const createdOn = await getToday(userId, now);
  return db.transaction(async (tx) => {
    const sortOrder = await habitsRepo.nextSortOrder(tx, userId);
    const [created] = await habitsRepo.insertHabits(tx, userId, [
      { ...values, createdOn, sortOrder },
    ]);
    if (!created) throw new Error("習慣を追加できませんでした");
    return toHabit(created);
  });
}

/**
 * O5・おすすめから選ぶ：選んだ習慣を「毎日・チェックのみ」でまとめて登録する。
 * 同じ名前の「現在の習慣」がすでにあるものは登録しない（二度押し・戻る操作での重複を防ぐ）。
 * 過去の習慣に同じ名前があっても、新しい習慣として登録する。
 * 戻り値は実際に登録した習慣だけ。
 */
export async function createHabitsFromPresets(
  userId: UserId,
  names: readonly string[],
  now: Date = new Date(),
): Promise<Habit[]> {
  const parsed = presetNamesSchema.safeParse(names);
  if (!parsed.success) {
    throw new ServiceError("invalid", "選んだ習慣の名前が正しくありません");
  }
  const unique = [...new Set(parsed.data)];
  if (unique.length === 0) return [];
  const createdOn = await getToday(userId, now);
  return db.transaction(async (tx) => {
    // 同時に送られても（二度押し・2つのタブ）、先の登録が終わってから読むようにする
    await habitsRepo.lockHabitsOfUser(tx, userId);
    const active = await habitsRepo.listHabits(tx, userId, "active");
    const existing = new Set(active.map((h) => h.name));
    const fresh = unique.filter((name) => !existing.has(name));
    if (fresh.length === 0) return [];
    const start = await habitsRepo.nextSortOrder(tx, userId);
    const created = await habitsRepo.insertHabits(
      tx,
      userId,
      fresh.map((name, index) => ({
        name,
        note: null,
        period: "daily" as const,
        recordType: "check" as const,
        timesPerPeriod: null,
        unit: null,
        quantityTarget: null,
        inputMode: null,
        createdOn,
        sortOrder: start + index,
      })),
    );
    return created.map(toHabit);
  });
}

/**
 * 習慣を編集する。
 * 「回ごとに足す」から別の入力のしかた（合計を入力・チェックのみ）に変えるときは、
 * 1日に複数ある記録を先に1行にまとめる（量は合計する）。まとめないと「1日1行」の一意制約で失敗する。
 * 記録の量は生のデータとして残す（チェックのみに変えても量は消さない）。
 */
export async function updateHabit(
  userId: UserId,
  habitId: string,
  input: HabitInput,
): Promise<Habit> {
  const values = parseHabitInput(input);
  return db.transaction(async (tx) => {
    // 編集中に記録が追加されて一意制約とぶつからないよう、習慣の行をロックする
    const current = await habitsRepo.findHabit(tx, userId, habitId, {
      forUpdate: true,
    });
    if (!current) throw habitNotFound();
    if (current.multiplePerDay && values.inputMode !== "increment") {
      await entriesRepo.mergeSameDayEntries(tx, userId, habitId);
    }
    const updated = await habitsRepo.updateHabit(tx, userId, habitId, values);
    if (!updated) throw habitNotFound();
    return toHabit(updated);
  });
}

/** 過去の習慣にする。すでに過去の習慣なら、最初に過去にした日のまま */
export async function archiveHabit(
  userId: UserId,
  habitId: string,
  now: Date = new Date(),
): Promise<void> {
  const habit = await habitsRepo.findHabit(db, userId, habitId);
  if (!habit) throw habitNotFound();
  if (habit.archivedOn) return;
  const today = await getToday(userId, now);
  await habitsRepo.setArchivedOn(db, userId, habitId, today);
}

/** 過去の習慣から戻す */
export async function restoreHabit(
  userId: UserId,
  habitId: string,
): Promise<void> {
  const updated = await habitsRepo.setArchivedOn(db, userId, habitId, null);
  if (!updated) throw habitNotFound();
}

/**
 * 並び順を orderedIds の順にする。指定した習慣どうしの順だけを振り直す
 * （画面は周期ごとのグループの中で並べ替えるので、そのグループの ID を渡せばよい）。
 * 他人の習慣・存在しない ID が混ざっていたら、何も変えずにエラーにする。
 */
export async function reorderHabits(
  userId: UserId,
  orderedIds: readonly string[],
): Promise<void> {
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ServiceError("invalid", "並び順に同じ習慣が重複しています");
  }
  if (orderedIds.some((id) => !idSchema.safeParse(id).success)) {
    throw habitNotFound();
  }
  if (orderedIds.length === 0) return;
  await db.transaction(async (tx) => {
    const owned = await habitsRepo.filterOwnedHabitIds(tx, userId, orderedIds);
    if (owned.length !== orderedIds.length) throw habitNotFound();
    await habitsRepo.setSortOrders(tx, userId, orderedIds);
  });
}
