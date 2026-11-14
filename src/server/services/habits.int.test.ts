import { describe, expect, it } from "vitest";
import {
  checkHabit,
  createHabit as insertHabit,
  createUser,
  d,
  entriesOf,
  incrementHabit,
  totalHabit,
} from "@/server/testing/factories";
import type { HabitInput } from "./types";

const habits = await import("./habits");
const record = await import("./record");

// 東京で 2024-11-01 10:00
const now = new Date("2024-11-01T01:00:00Z");

const input = (overrides: Partial<HabitInput> = {}): HabitInput => ({
  ...checkHabit(),
  ...overrides,
});

describe("createHabit", () => {
  it("作った日はサーバーで決めた今日、並び順はいちばん後ろ", async () => {
    const me = await createUser({ timezone: "Asia/Tokyo" });
    const first = await habits.createHabit(me, input({ name: "読書" }), now);
    const second = await habits.createHabit(
      me,
      input({ name: " 早起き ", note: "" }),
      now,
    );
    expect(first).toMatchObject({ createdOn: "2024-11-01", sortOrder: 0 });
    expect(second).toMatchObject({
      name: "早起き",
      note: null,
      sortOrder: 1,
      archivedOn: null,
    });
  });

  it("組み合わせが正しくない入力は拒否する", async () => {
    const me = await createUser();
    await expect(
      habits.createHabit(me, input({ period: "weekly" }), now),
    ).rejects.toThrow("回数の目標を入力してください");
    await expect(
      habits.createHabit(me, input({ unit: "回" }), now),
    ).rejects.toThrow();
    await expect(
      habits.createHabit(me, { ...totalHabit(), unit: null }, now),
    ).rejects.toThrow("単位を入力してください");
    await expect(
      habits.createHabit(me, input({ name: "  " }), now),
    ).rejects.toThrow();
    expect((await habits.getHabitList(me, "active")).counts.active).toBe(0);
  });

  it("週次のチェックのみ・量の習慣を作れる", async () => {
    const me = await createUser();
    const weekly = await habits.createHabit(
      me,
      input({ period: "weekly", timesPerPeriod: 3 }),
      now,
    );
    const quantity = await habits.createHabit(
      me,
      { ...totalHabit(), quantityTarget: null },
      now,
    );
    expect(weekly.timesPerPeriod).toBe(3);
    expect(quantity).toMatchObject({ unit: "回", quantityTarget: null });
  });
});

describe("createHabitsFromPresets（オンボーディング）", () => {
  it("毎日・チェックのみでまとめて登録する（重複は1つにする）", async () => {
    const me = await createUser();
    await habits.createHabit(me, input({ name: "既存" }), now);
    const created = await habits.createHabitsFromPresets(
      me,
      ["読書", "早起き", "読書"],
      now,
    );
    expect(created).toEqual([
      expect.objectContaining({
        name: "読書",
        period: "daily",
        recordType: "check",
        sortOrder: 1,
        createdOn: "2024-11-01",
      }),
      expect.objectContaining({ name: "早起き", sortOrder: 2 }),
    ]);
  });

  it("0件なら何もしない", async () => {
    const me = await createUser();
    expect(await habits.createHabitsFromPresets(me, [], now)).toEqual([]);
  });

  it("同じ名前の現在の習慣があれば登録しない。過去の習慣と同じ名前は登録する", async () => {
    const me = await createUser();
    await habits.createHabit(me, input({ name: "読書" }), now);
    const archived = await habits.createHabit(me, input({ name: "日記" }), now);
    await habits.archiveHabit(me, archived.id, now);

    const created = await habits.createHabitsFromPresets(
      me,
      ["読書", "日記", "瞑想"],
      now,
    );
    expect(created.map((h) => h.name)).toEqual(["日記", "瞑想"]);
    expect(
      await habits.createHabitsFromPresets(me, ["読書", "瞑想"], now),
    ).toEqual([]);
    const list = await habits.getHabitList(me, "active");
    expect(list.groups[0]?.habits.map((h) => h.name)).toEqual([
      "読書",
      "日記",
      "瞑想",
    ]);
  });

  it("同時に送られても重複して登録しない（二度押し・2つのタブ）", async () => {
    // 1回だけだと競合が起きないことがあるので、数回くり返す
    for (let round = 0; round < 5; round++) {
      const me = await createUser();
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          habits.createHabitsFromPresets(me, ["読書", "瞑想"], now),
        ),
      );
      expect(results.flat().map((h) => h.name)).toEqual(["読書", "瞑想"]);
      expect(await habits.getActiveHabitNames(me)).toEqual(["読書", "瞑想"]);
    }
  });
});

describe("getHabit / getHabitList", () => {
  it("周期ごとにまとめ、並び順に並べる。他人の習慣は含めない", async () => {
    const me = await createUser();
    const other = await createUser();
    await insertHabit(other);
    const b = await insertHabit(me, checkHabit({ name: "B" }), {
      sortOrder: 2,
    });
    const a = await insertHabit(me, checkHabit({ name: "A" }), {
      sortOrder: 1,
    });
    const run = await insertHabit(me, incrementHabit(), { sortOrder: 0 });
    const old = await insertHabit(me, checkHabit({ name: "旧" }));
    await habits.archiveHabit(me, old, now);

    const list = await habits.getHabitList(me, "active");
    expect(list.counts).toEqual({ active: 3, archived: 1 });
    expect(
      list.groups.map((g) => [g.period, g.habits.map((h) => h.id)]),
    ).toEqual([
      ["daily", [a, b]],
      ["weekly", [run]],
    ]);
    const archived = await habits.getHabitList(me, "archived");
    expect(archived.groups.flatMap((g) => g.habits.map((h) => h.id))).toEqual([
      old,
    ]);
  });

  it("他人の習慣は取得できない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await insertHabit(other);
    expect(await habits.getHabit(me, theirs)).toBeNull();
    expect((await habits.getHabit(other, theirs))?.id).toBe(theirs);
  });
});

describe("updateHabit", () => {
  it("習慣を編集する。他人の習慣は編集できない", async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = await insertHabit(me);
    const theirs = await insertHabit(other);
    const updated = await habits.updateHabit(
      me,
      mine,
      input({ name: "ストレッチ", period: "weekly", timesPerPeriod: 3 }),
    );
    expect(updated).toMatchObject({
      name: "ストレッチ",
      period: "weekly",
      timesPerPeriod: 3,
      createdOn: "2024-10-01",
    });
    await expect(
      habits.updateHabit(me, theirs, input({ name: "x" })),
    ).rejects.toThrow("習慣が見つかりません");
    expect((await habits.getHabit(other, theirs))?.name).toBe("読書");
  });

  it("回ごとに足す → 合計を入力 に変えると、同じ日の記録を1行にまとめる", async () => {
    const me = await createUser();
    const habitId = await insertHabit(me, incrementHabit());
    await record.addQuantity(me, habitId, d("2024-10-31"), 3.2);
    await record.addQuantity(me, habitId, d("2024-10-31"), 1.5);
    await record.addQuantity(me, habitId, d("2024-11-01"), 2);

    await habits.updateHabit(me, habitId, {
      ...incrementHabit(),
      inputMode: "total",
    });
    expect(await entriesOf(habitId)).toEqual([
      expect.objectContaining({ date: "2024-10-31", quantity: 4.7 }),
      expect.objectContaining({ date: "2024-11-01", quantity: 2 }),
    ]);
    // 以降は合計を入力の習慣として1日1行で記録できる
    await record.setQuantityTotal(me, habitId, d("2024-10-31"), 5);
    expect(await entriesOf(habitId)).toHaveLength(2);
  });

  it("合計を入力 → 回ごとに足す に変えると、同じ日に何行でも足せる", async () => {
    const me = await createUser();
    const habitId = await insertHabit(me, totalHabit());
    await record.setQuantityTotal(me, habitId, d("2024-11-01"), 20);
    await habits.updateHabit(me, habitId, {
      ...totalHabit(),
      inputMode: "increment",
    });
    await record.addQuantity(me, habitId, d("2024-11-01"), 5);
    expect(await entriesOf(habitId)).toHaveLength(2);
  });

  it("回ごとに足す → チェックのみ に変えても、記録は1日1行にまとまる", async () => {
    const me = await createUser();
    const habitId = await insertHabit(me, incrementHabit());
    await record.addQuantity(me, habitId, d("2024-11-01"), 1);
    await record.addQuantity(me, habitId, d("2024-11-01"), 2);
    await habits.updateHabit(
      me,
      habitId,
      input({ period: "weekly", timesPerPeriod: 2 }),
    );
    expect(await entriesOf(habitId)).toHaveLength(1);
    expect(await record.toggleCheck(me, habitId, d("2024-11-01"))).toBe(false);
  });
});

describe("archiveHabit / restoreHabit", () => {
  it("過去にした日は今日。戻すと現在の習慣になる。記録は残る", async () => {
    const me = await createUser();
    const habitId = await insertHabit(me);
    await record.toggleCheck(me, habitId, d("2024-10-31"));

    await habits.archiveHabit(me, habitId, now);
    expect((await habits.getHabit(me, habitId))?.archivedOn).toBe("2024-11-01");
    // もう一度過去にしても、最初の日のまま
    await habits.archiveHabit(me, habitId, new Date("2024-11-05T01:00:00Z"));
    expect((await habits.getHabit(me, habitId))?.archivedOn).toBe("2024-11-01");

    await habits.restoreHabit(me, habitId);
    expect((await habits.getHabit(me, habitId))?.archivedOn).toBeNull();
    expect(await entriesOf(habitId)).toHaveLength(1);
  });

  it("他人の習慣は過去にできない・戻せない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await insertHabit(other);
    await expect(habits.archiveHabit(me, theirs, now)).rejects.toThrow(
      "習慣が見つかりません",
    );
    await habits.archiveHabit(other, theirs, now);
    await expect(habits.restoreHabit(me, theirs)).rejects.toThrow(
      "習慣が見つかりません",
    );
    expect((await habits.getHabit(other, theirs))?.archivedOn).toBe(
      "2024-11-01",
    );
  });
});

describe("reorderHabits", () => {
  it("指定した順に並び替える", async () => {
    const me = await createUser();
    const a = await insertHabit(me, checkHabit({ name: "A" }), {
      sortOrder: 0,
    });
    const b = await insertHabit(me, checkHabit({ name: "B" }), {
      sortOrder: 1,
    });
    const c = await insertHabit(me, checkHabit({ name: "C" }), {
      sortOrder: 2,
    });
    await habits.reorderHabits(me, [c, a, b]);
    const list = await habits.getHabitList(me, "active");
    expect(list.groups[0]?.habits.map((h) => h.id)).toEqual([c, a, b]);
  });

  it("他人の習慣・重複が混ざっていたら何も変えない", async () => {
    const me = await createUser();
    const other = await createUser();
    const a = await insertHabit(me, checkHabit({ name: "A" }), {
      sortOrder: 0,
    });
    const b = await insertHabit(me, checkHabit({ name: "B" }), {
      sortOrder: 1,
    });
    const theirs = await insertHabit(other, checkHabit(), { sortOrder: 5 });
    await expect(habits.reorderHabits(me, [b, theirs, a])).rejects.toThrow(
      "習慣が見つかりません",
    );
    await expect(habits.reorderHabits(me, [b, b])).rejects.toThrow();
    expect((await habits.getHabit(me, a))?.sortOrder).toBe(0);
    expect((await habits.getHabit(other, theirs))?.sortOrder).toBe(5);
  });
});
