import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeToLogicalDate } from "@/server/testing/fake-date";
import {
  createHabit,
  createUser,
  entriesOf,
  incrementHabit,
  totalHabit,
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
// domain の日付の計算が実装されるまで差し替える
vi.mock("@/domain/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/domain/date")>()),
  toLogicalDate: fakeToLogicalDate,
}));

const { revalidatePath } = await import("next/cache");
const {
  addQuantityAction,
  deleteEntryAction,
  repeatLastQuantityAction,
  setQuantityTotalAction,
  toggleCheckAction,
} = await import("./record");

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  // 東京で 2024-11-01 10:00
  vi.setSystemTime(new Date("2024-11-01T01:00:00Z"));
  auth.userId = await createUser({ timezone: "Asia/Tokyo", dayStartHour: 4 });
  return () => vi.useRealTimers();
});

describe("記録の Server Actions", () => {
  it("日付を省くと、サーバーで決めた今日に記録し、記録の画面を更新する", async () => {
    const habitId = await createHabit(auth.userId);
    const result = await toggleCheckAction({ habitId });
    expect(result).toEqual({
      ok: true,
      data: { checked: true, date: "2024-11-01" },
    });
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ date: "2024-11-01" }),
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/record/today");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/(main)/review/[date]",
      "page",
    );
  });

  it("日付が切り替わる時刻より前は、前の日に記録する", async () => {
    vi.setSystemTime(new Date("2024-11-01T17:30:00Z")); // 東京で 11/2 02:30
    const habitId = await createHabit(auth.userId);
    const result = await toggleCheckAction({ habitId });
    expect(result.ok && result.data.date).toBe("2024-11-01");
  });

  it("過去の日は指定できるが、未来の日は拒否する", async () => {
    const habitId = await createHabit(auth.userId);
    expect((await toggleCheckAction({ habitId, date: "2024-10-30" })).ok).toBe(
      true,
    );
    expect(await toggleCheckAction({ habitId, date: "2024-11-02" })).toEqual({
      ok: false,
      error: "未来の日付には記録できません",
    });
    expect(await entriesOf(habitId)).toHaveLength(1);
  });

  it("入力の形が正しくなければ拒否する", async () => {
    const habitId = await createHabit(auth.userId);
    const invalid = { ok: false, error: "入力の値が正しくありません" };
    expect(await toggleCheckAction({ habitId: "abc" })).toEqual(invalid);
    expect(await toggleCheckAction({ habitId, date: "2024-13-01" })).toEqual(
      invalid,
    );
    expect(await addQuantityAction({ habitId, quantity: Number.NaN })).toEqual(
      invalid,
    );
    expect(await setQuantityTotalAction({ habitId, quantity: -1 })).toEqual(
      invalid,
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("他人の習慣・記録には触れない", async () => {
    const other = await createUser();
    const theirs = await createHabit(other, incrementHabit());
    const notFound = { ok: false, error: "習慣が見つかりません" };
    expect(await toggleCheckAction({ habitId: theirs })).toEqual(notFound);
    expect(await addQuantityAction({ habitId: theirs, quantity: 1 })).toEqual(
      notFound,
    );
    expect(await repeatLastQuantityAction({ habitId: theirs })).toEqual(
      notFound,
    );

    auth.userId = other;
    const added = await addQuantityAction({ habitId: theirs, quantity: 1 });
    if (!added.ok) throw new Error(added.error);
    auth.userId = await createUser();
    expect(await deleteEntryAction({ entryId: added.data.entryId })).toEqual({
      ok: false,
      error: "記録が見つかりません",
    });
    expect(await entriesOf(theirs)).toHaveLength(1);
  });

  it("1回分を追加して、返した ID で取り消せる", async () => {
    const habitId = await createHabit(auth.userId, incrementHabit());
    const added = await addQuantityAction({ habitId, quantity: 2.5 });
    if (!added.ok) throw new Error(added.error);
    const repeated = await repeatLastQuantityAction({ habitId });
    expect(repeated).toEqual({
      ok: true,
      data: { entryId: expect.any(String), quantity: 2.5 },
    });
    expect(await entriesOf(habitId)).toHaveLength(2);

    if (!repeated.ok) throw new Error(repeated.error);
    expect(await deleteEntryAction({ entryId: repeated.data.entryId })).toEqual(
      { ok: true, data: undefined },
    );
    expect(await deleteEntryAction({ entryId: added.data.entryId })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await entriesOf(habitId)).toEqual([]);
  });

  it("合計を上書きし、0 で消す", async () => {
    const habitId = await createHabit(auth.userId, totalHabit());
    await setQuantityTotalAction({ habitId, quantity: 20 });
    await setQuantityTotalAction({ habitId, quantity: 30 });
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ date: "2024-11-01", quantity: 30 }),
    ]);
    await setQuantityTotalAction({ habitId, quantity: 0 });
    expect(await entriesOf(habitId)).toEqual([]);
  });
});
