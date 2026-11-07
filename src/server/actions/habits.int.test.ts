import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeToLogicalDate } from "@/server/testing/fake-date";
import {
  checkHabit,
  createHabit,
  createUser,
} from "@/server/testing/factories";

const auth = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/server/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: auth.userId,
    name: "テスト",
    email: "test@example.com",
    image: null,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/domain/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/domain/date")>()),
  toLogicalDate: fakeToLogicalDate,
}));

const { revalidatePath } = await import("next/cache");
const actions = await import("./habits");
const { getHabit } = await import("@/server/services/habits");

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  auth.userId = await createUser();
});

describe("習慣の Server Actions", () => {
  it("追加すると、習慣と記録の画面を更新する", async () => {
    const result = await actions.createHabitAction(
      checkHabit({ name: "読書" }),
    );
    expect(result).toMatchObject({ ok: true, data: { name: "読書" } });
    expect(revalidatePath).toHaveBeenCalledWith("/habits");
    expect(revalidatePath).toHaveBeenCalledWith("/record/today");
  });

  it("入力の組み合わせが正しくなければ、理由を返す", async () => {
    expect(
      await actions.createHabitAction(checkHabit({ period: "monthly" })),
    ).toEqual({ ok: false, error: "回数の目標を入力してください" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("おすすめからまとめて登録する", async () => {
    const result = await actions.createHabitsFromPresetsAction({
      names: ["読書", "早起き"],
    });
    expect(result.ok && result.data.map((h) => h.name)).toEqual([
      "読書",
      "早起き",
    ]);
  });

  it("他人の習慣は編集・過去にする・戻す・並べ替えができない", async () => {
    const other = await createUser();
    const theirs = await createHabit(other);
    const notFound = { ok: false, error: "習慣が見つかりません" };
    expect(
      await actions.updateHabitAction({
        habitId: theirs,
        habit: checkHabit({ name: "乗っ取り" }),
      }),
    ).toEqual(notFound);
    expect(await actions.archiveHabitAction({ habitId: theirs })).toEqual(
      notFound,
    );
    expect(await actions.restoreHabitAction({ habitId: theirs })).toEqual(
      notFound,
    );
    expect(await actions.reorderHabitsAction({ orderedIds: [theirs] })).toEqual(
      notFound,
    );
    expect(await getHabit(other, theirs)).toMatchObject({
      name: "読書",
      archivedOn: null,
    });
  });

  it("自分の習慣を編集・過去にする・戻す", async () => {
    const habitId = await createHabit(auth.userId);
    expect(
      await actions.updateHabitAction({
        habitId,
        habit: checkHabit({ name: "早起き" }),
      }),
    ).toMatchObject({ ok: true, data: { name: "早起き" } });
    expect((await actions.archiveHabitAction({ habitId })).ok).toBe(true);
    expect((await getHabit(auth.userId, habitId))?.archivedOn).not.toBeNull();
    expect((await actions.restoreHabitAction({ habitId })).ok).toBe(true);
    expect((await getHabit(auth.userId, habitId))?.archivedOn).toBeNull();
  });
});
