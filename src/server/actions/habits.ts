"use server";
/**
 * 習慣の Server Actions（④⑤O5 から呼ぶ）。
 * 入力は zod で検証し、習慣は必ずログイン中のユーザーのものに絞る（service）。
 */
import { z } from "zod";
import type { Habit } from "@/domain/types";
import { requireUser } from "@/server/auth";
import * as habits from "@/server/services/habits";
import type { ActionResult, HabitInput } from "@/server/services/types";
import {
  habitInputSchema,
  idSchema,
  presetNamesSchema,
} from "@/server/validation";
import { revalidateHabits } from "./revalidate";
import { runAction } from "./run";

/** ⑤-a 習慣を追加する */
export async function createHabitAction(
  input: HabitInput,
): Promise<ActionResult<Habit>> {
  const user = await requireUser();
  return runAction(async () => {
    const created = await habits.createHabit(
      user.id,
      habitInputSchema.parse(input),
    );
    revalidateHabits();
    return created;
  });
}

/** おすすめから選ぶ：選んだ習慣をまとめて登録する（0件なら何もしない）。O5 は startWithPresetsAction */
export async function createHabitsFromPresetsAction(input: {
  names: string[];
}): Promise<ActionResult<Habit[]>> {
  const user = await requireUser();
  return runAction(async () => {
    const { names } = z.object({ names: presetNamesSchema }).parse(input);
    const created = await habits.createHabitsFromPresets(user.id, names);
    revalidateHabits();
    return created;
  });
}

/** ⑤-b 習慣を編集する */
export async function updateHabitAction(input: {
  habitId: string;
  habit: HabitInput;
}): Promise<ActionResult<Habit>> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId, habit } = z
      .object({ habitId: idSchema, habit: habitInputSchema })
      .parse(input);
    const updated = await habits.updateHabit(user.id, habitId, habit);
    revalidateHabits();
    return updated;
  });
}

/** ⑤-b 過去の習慣にする */
export async function archiveHabitAction(input: {
  habitId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId } = z.object({ habitId: idSchema }).parse(input);
    await habits.archiveHabit(user.id, habitId);
    revalidateHabits();
  });
}

/** ④ 過去の習慣から戻す */
export async function restoreHabitAction(input: {
  habitId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { habitId } = z.object({ habitId: idSchema }).parse(input);
    await habits.restoreHabit(user.id, habitId);
    revalidateHabits();
  });
}

/** ④ 並べ替え。並べ替えたグループの習慣の ID を新しい順に渡す */
export async function reorderHabitsAction(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  const user = await requireUser();
  return runAction(async () => {
    const { orderedIds } = z
      .object({ orderedIds: z.array(idSchema).max(200) })
      .parse(input);
    await habits.reorderHabits(user.id, orderedIds);
    revalidateHabits();
  });
}
