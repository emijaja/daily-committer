import { notImplemented } from "@/domain/not-implemented";
import type { Habit } from "@/domain/types";
import type { HabitInput, HabitListView, UserId } from "./types";

export async function getHabitList(
  userId: UserId,
  status: "active" | "archived",
): Promise<HabitListView> {
  return notImplemented(`getHabitList(${userId}, ${status})`);
}

export async function getHabit(
  userId: UserId,
  habitId: string,
): Promise<Habit | null> {
  return notImplemented(`getHabit(${userId}, ${habitId})`);
}

export async function createHabit(
  userId: UserId,
  input: HabitInput,
): Promise<Habit> {
  return notImplemented(`createHabit(${userId}, ${input.name})`);
}

/** O5：おすすめから選んだ習慣を「毎日・チェックのみ」でまとめて登録する */
export async function createHabitsFromPresets(
  userId: UserId,
  names: readonly string[],
): Promise<Habit[]> {
  return notImplemented(`createHabitsFromPresets(${userId}, ${names.length})`);
}

export async function updateHabit(
  userId: UserId,
  habitId: string,
  input: HabitInput,
): Promise<Habit> {
  return notImplemented(`updateHabit(${userId}, ${habitId}, ${input.name})`);
}

/** 過去の習慣にする */
export async function archiveHabit(
  userId: UserId,
  habitId: string,
): Promise<void> {
  return notImplemented(`archiveHabit(${userId}, ${habitId})`);
}

/** 過去の習慣から戻す */
export async function restoreHabit(
  userId: UserId,
  habitId: string,
): Promise<void> {
  return notImplemented(`restoreHabit(${userId}, ${habitId})`);
}

export async function reorderHabits(
  userId: UserId,
  orderedIds: readonly string[],
): Promise<void> {
  return notImplemented(`reorderHabits(${userId}, ${orderedIds.length})`);
}
