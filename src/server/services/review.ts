import { notImplemented } from "@/domain/not-implemented";
import type { LogicalDate } from "@/domain/types";
import type { DayEditView, HabitDetailView, ReviewView, UserId } from "./types";

/** ⑥-a。habitId を指定すると「習慣ごと」 */
export async function getReviewView(
  userId: UserId,
  year: number,
  habitId: string | null,
  now: Date = new Date(),
): Promise<ReviewView> {
  return notImplemented(
    `getReviewView(${userId}, ${year}, ${habitId}, ${now.toISOString()})`,
  );
}

/** ② 記録の確認・修正 */
export async function getDayEditView(
  userId: UserId,
  date: LogicalDate,
): Promise<DayEditView> {
  return notImplemented(`getDayEditView(${userId}, ${date})`);
}

/** ③ 習慣の詳細 */
export async function getHabitDetail(
  userId: UserId,
  habitId: string,
  now: Date = new Date(),
): Promise<HabitDetailView | null> {
  return notImplemented(
    `getHabitDetail(${userId}, ${habitId}, ${now.toISOString()})`,
  );
}
