import type { Habit, LogicalDate } from "./types";

/**
 * その日に「現在の習慣」だったか。domain-spec.md 6章。
 * createdOn <= date かつ（archivedOn が null か date < archivedOn）。
 */
export function isActiveOn(habit: Habit, date: LogicalDate): boolean {
  return (
    habit.createdOn <= date &&
    (habit.archivedOn === null || date < habit.archivedOn)
  );
}
