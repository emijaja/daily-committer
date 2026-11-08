import { describe, expect, it } from "vitest";
import {
  checkHabit,
  createHabit,
  createUser,
  d,
  entriesOf,
  incrementHabit,
  totalHabit,
} from "@/server/testing/factories";
import {
  addQuantity,
  deleteEntry,
  repeatLastQuantity,
  setQuantityTotal,
  toggleCheck,
} from "./record";

const day = d("2024-11-01");

describe("toggleCheck", () => {
  it("付ける → 外す を繰り返せる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);

    expect(await toggleCheck(me, habitId, day)).toBe(true);
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ date: "2024-11-01", quantity: null }),
    ]);
    expect(await toggleCheck(me, habitId, day)).toBe(false);
    expect(await entriesOf(habitId)).toEqual([]);
  });

  it("他人の習慣には付けられない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);
    await expect(toggleCheck(me, theirs, day)).rejects.toThrow(
      "習慣が見つかりません",
    );
    expect(await entriesOf(theirs)).toEqual([]);
  });

  it("他人の記録を外すこともできない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);
    await toggleCheck(other, theirs, day);
    await expect(toggleCheck(me, theirs, day)).rejects.toThrow();
    expect(await entriesOf(theirs)).toHaveLength(1);
  });

  it("量の習慣には使えない", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, totalHabit());
    await expect(toggleCheck(me, habitId, day)).rejects.toThrow(
      "この習慣では使えない記録のしかたです",
    );
  });

  it("同時に2回押されても、2行にならず・エラーにならない", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);
    const results = await Promise.all([
      toggleCheck(me, habitId, day),
      toggleCheck(me, habitId, day),
    ]);
    const rows = await entriesOf(habitId);
    // 順に処理されたら「付けた → 外した」で0行。重なったら両方「付けた」で1行（衝突した方は何もしない）
    if (results.includes(false)) expect(rows).toHaveLength(0);
    else expect(rows).toHaveLength(1);
  });

  it("同時に何回押されても行は1つまでで、そのあとも正しく付け外しできる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);
    await Promise.all(
      Array.from({ length: 10 }, () => toggleCheck(me, habitId, day)),
    );
    const rows = await entriesOf(habitId);
    expect(rows.length).toBeLessThanOrEqual(1);

    const checked = await toggleCheck(me, habitId, day);
    expect(checked).toBe(rows.length === 0);
    expect(await entriesOf(habitId)).toHaveLength(checked ? 1 : 0);
  });
});

describe("setQuantityTotal（合計を入力）", () => {
  it("同じ日の合計を上書きし、1日1行のまま", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, totalHabit());
    await setQuantityTotal(me, habitId, day, 20);
    await setQuantityTotal(me, habitId, day, 25);
    await setQuantityTotal(me, habitId, d("2024-11-02"), 5);
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ date: "2024-11-01", quantity: 25 }),
      expect.objectContaining({ date: "2024-11-02", quantity: 5 }),
    ]);
  });

  it("0 にすると記録を消す", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, totalHabit());
    await setQuantityTotal(me, habitId, day, 20);
    await setQuantityTotal(me, habitId, day, 0);
    expect(await entriesOf(habitId)).toEqual([]);
  });

  it("同時に上書きされても1行だけ残り、値はどちらかになる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, totalHabit());
    await Promise.all(
      [10, 20, 30, 40, 50].map((q) => setQuantityTotal(me, habitId, day, q)),
    );
    const rows = await entriesOf(habitId);
    expect(rows).toHaveLength(1);
    expect([10, 20, 30, 40, 50]).toContain(rows[0]?.quantity);
  });

  it("他人の習慣・回ごとに足す習慣・負の値は拒否する", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other, totalHabit());
    const increment = await createHabit(me, incrementHabit());
    const mine = await createHabit(me, totalHabit());
    await expect(setQuantityTotal(me, theirs, day, 10)).rejects.toThrow(
      "習慣が見つかりません",
    );
    await expect(setQuantityTotal(me, increment, day, 10)).rejects.toThrow();
    await expect(setQuantityTotal(me, mine, day, -1)).rejects.toThrow(
      "量の値が正しくありません",
    );
    expect(await entriesOf(theirs)).toEqual([]);
  });
});

describe("addQuantity（回ごとに足す）と取り消し", () => {
  it("1回ごとに行を足し、返した ID で取り消せる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, incrementHabit());
    await addQuantity(me, habitId, day, 3.2);
    const id = await addQuantity(me, habitId, day, 2.5);
    expect(await entriesOf(habitId)).toHaveLength(2);

    await deleteEntry(me, id);
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ quantity: 3.2 }),
    ]);
  });

  it("同時に足しても、すべての回が記録される", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, incrementHabit());
    const ids = await Promise.all(
      [1, 2, 3, 4].map((q) => addQuantity(me, habitId, day, q)),
    );
    expect(new Set(ids).size).toBe(4);
    expect(await entriesOf(habitId)).toHaveLength(4);
  });

  it("他人の習慣・合計を入力の習慣・0 以下は拒否する", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other, incrementHabit());
    const total = await createHabit(me, totalHabit());
    const mine = await createHabit(me, incrementHabit());
    await expect(addQuantity(me, theirs, day, 1)).rejects.toThrow(
      "習慣が見つかりません",
    );
    await expect(addQuantity(me, total, day, 1)).rejects.toThrow();
    await expect(addQuantity(me, mine, day, 0)).rejects.toThrow();
    expect(await entriesOf(theirs)).toEqual([]);
    expect(await entriesOf(total)).toEqual([]);
  });

  it("他人の記録は取り消せない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other, incrementHabit());
    const id = await addQuantity(other, theirs, day, 1);
    await expect(deleteEntry(me, id)).rejects.toThrow("記録が見つかりません");
    await expect(deleteEntry(me, "not-a-uuid")).rejects.toThrow();
    expect(await entriesOf(theirs)).toHaveLength(1);
  });

  it("同じ記録を2回取り消すと、2回目はエラー", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, incrementHabit());
    const id = await addQuantity(me, habitId, day, 1);
    await deleteEntry(me, id);
    await expect(deleteEntry(me, id)).rejects.toThrow("記録が見つかりません");
  });
});

describe("repeatLastQuantity（＋の長押し）", () => {
  it("回ごとに足す：前回の1回分と同じ量を追加し、取り消せる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, incrementHabit());
    await addQuantity(me, habitId, d("2024-10-30"), 3);
    await addQuantity(me, habitId, d("2024-10-31"), 2.5);

    const result = await repeatLastQuantity(me, habitId, day);
    expect(result.quantity).toBe(2.5);
    expect(await entriesOf(habitId)).toHaveLength(3);

    await deleteEntry(me, result.entryId);
    expect(await entriesOf(habitId)).toHaveLength(2);
  });

  it("合計を入力：その日の記録がなければ前回の合計で記録する。あれば上書きしない", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, totalHabit());
    await setQuantityTotal(me, habitId, d("2024-10-31"), 25);

    const result = await repeatLastQuantity(me, habitId, day);
    expect(result.quantity).toBe(25);
    await expect(repeatLastQuantity(me, habitId, day)).rejects.toThrow(
      "この日の記録はすでにあります",
    );
    expect(await entriesOf(habitId)).toHaveLength(2);
  });

  it("前回の記録がなければエラー", async () => {
    const me = await createUser();
    const habitId = await createHabit(me, incrementHabit());
    await expect(repeatLastQuantity(me, habitId, day)).rejects.toThrow(
      "前回の記録がありません",
    );
  });

  it("他人の習慣・チェックのみの習慣は拒否する", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other, incrementHabit());
    await addQuantity(other, theirs, day, 1);
    const check = await createHabit(me, checkHabit());
    await expect(repeatLastQuantity(me, theirs, day)).rejects.toThrow(
      "習慣が見つかりません",
    );
    await expect(repeatLastQuantity(me, check, day)).rejects.toThrow();
    expect(await entriesOf(theirs)).toHaveLength(1);
  });
});
