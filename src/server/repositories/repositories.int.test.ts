import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { entries } from "@/db/schema";
import {
  checkHabit,
  createHabit,
  createUser,
  d,
  entriesOf,
  incrementHabit,
  totalHabit,
} from "@/server/testing/factories";
import * as entriesRepo from "./entries";
import * as habitsRepo from "./habits";
import * as settingsRepo from "./settings";

describe("habits repository", () => {
  it("自分の習慣だけを取得する（他人の ID・uuid でない ID は null）", async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = await createHabit(me);
    const theirs = await createHabit(other);

    expect((await habitsRepo.findHabit(db, me, mine))?.id).toBe(mine);
    expect(await habitsRepo.findHabit(db, me, theirs)).toBeNull();
    expect(await habitsRepo.findHabit(db, me, "not-a-uuid")).toBeNull();
    expect((await habitsRepo.listHabits(db, me)).map((h) => h.id)).toEqual([
      mine,
    ]);
  });

  it("他人の習慣は書き換えられない", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);

    expect(
      await habitsRepo.updateHabit(db, me, theirs, checkHabit({ name: "x" })),
    ).toBeNull();
    expect(
      await habitsRepo.setArchivedOn(db, me, theirs, d("2024-11-01")),
    ).toBe(false);
    expect((await habitsRepo.findHabit(db, other, theirs))?.name).toBe("読書");
  });

  it("現在の習慣と過去の習慣の数を数える", async () => {
    const me = await createUser();
    await createHabit(me);
    await createHabit(me);
    const archived = await createHabit(me);
    await habitsRepo.setArchivedOn(db, me, archived, d("2024-11-02"));

    expect(await habitsRepo.countHabits(db, me)).toEqual({
      active: 2,
      archived: 1,
    });
  });

  it("回ごとに足す習慣だけ multiplePerDay が true になる", async () => {
    const me = await createUser();
    const check = await habitsRepo.findHabit(db, me, await createHabit(me));
    const total = await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, totalHabit()),
    );
    const increment = await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, incrementHabit()),
    );
    expect(check?.multiplePerDay).toBe(false);
    expect(total?.multiplePerDay).toBe(false);
    expect(increment?.multiplePerDay).toBe(true);
  });
});

describe("entries repository と DB の制約", () => {
  it("1日1行の習慣は、DB が同じ日の2行目を拒否する", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);
    const row = {
      habitId,
      userId: me,
      multiplePerDay: false,
      date: "2024-11-01",
    };
    await db.insert(entries).values(row);
    await expect(db.insert(entries).values(row)).rejects.toThrow();
  });

  it("他人の習慣に記録を付けようとすると、DB の外部キーが拒否する", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createHabit(other);
    await expect(
      db.insert(entries).values({
        habitId: theirs,
        userId: me,
        multiplePerDay: false,
        date: "2024-11-01",
      }),
    ).rejects.toThrow();
  });

  it("insertSingleIfAbsent は2回目は何もしない", async () => {
    const me = await createUser();
    const habit = (await habitsRepo.findHabit(db, me, await createHabit(me)))!;
    const first = await entriesRepo.insertSingleIfAbsent(
      db,
      me,
      habit,
      d("2024-11-01"),
      null,
    );
    const second = await entriesRepo.insertSingleIfAbsent(
      db,
      me,
      habit,
      d("2024-11-01"),
      null,
    );
    expect(first).toEqual(expect.any(String));
    expect(second).toBeNull();
    expect(await entriesOf(habit.id)).toHaveLength(1);
  });

  it("upsertSingle は同じ日の量を上書きする", async () => {
    const me = await createUser();
    const habit = (await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, totalHabit()),
    ))!;
    await entriesRepo.upsertSingle(db, me, habit, d("2024-11-01"), 10);
    await entriesRepo.upsertSingle(db, me, habit, d("2024-11-01"), 25);
    expect(await entriesOf(habit.id)).toEqual([
      expect.objectContaining({ date: "2024-11-01", quantity: 25 }),
    ]);
  });

  it("他人の記録は消せない", async () => {
    const me = await createUser();
    const other = await createUser();
    const habit = (await habitsRepo.findHabit(
      db,
      other,
      await createHabit(other),
    ))!;
    const id = await entriesRepo.insertEntry(
      db,
      other,
      habit,
      d("2024-11-01"),
      null,
    );
    expect(await entriesRepo.deleteEntry(db, me, id)).toBe(false);
    expect(
      await entriesRepo.deleteByHabitAndDate(db, me, habit.id, d("2024-11-01")),
    ).toBe(0);
    expect(await entriesOf(habit.id)).toHaveLength(1);
  });

  it("listEntries は自分の記録を期間で絞り、日付の古い順に返す", async () => {
    const me = await createUser();
    const other = await createUser();
    const habit = (await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, incrementHabit()),
    ))!;
    const theirs = (await habitsRepo.findHabit(
      db,
      other,
      await createHabit(other, incrementHabit()),
    ))!;
    for (const date of ["2024-11-03", "2024-10-31", "2024-11-01"]) {
      await entriesRepo.insertEntry(db, me, habit, d(date), 1);
      await entriesRepo.insertEntry(db, other, theirs, d(date), 1);
    }
    const found = await entriesRepo.listEntries(db, me, {
      range: { start: d("2024-11-01"), end: d("2024-11-30") },
    });
    expect(found.map((e) => e.date)).toEqual(["2024-11-01", "2024-11-03"]);
    expect(found.every((e) => e.habitId === habit.id)).toBe(true);
  });

  it("findFirstEntryDate は自分の記録のいちばん古い日を返す（習慣で絞れる）", async () => {
    const me = await createUser();
    const other = await createUser();
    const a = (await habitsRepo.findHabit(db, me, await createHabit(me)))!;
    const b = (await habitsRepo.findHabit(db, me, await createHabit(me)))!;
    const theirs = (await habitsRepo.findHabit(
      db,
      other,
      await createHabit(other),
    ))!;
    expect(await entriesRepo.findFirstEntryDate(db, me)).toBeNull();
    await entriesRepo.insertEntry(db, other, theirs, d("2024-01-01"), null);
    await entriesRepo.insertEntry(db, me, a, d("2024-11-03"), null);
    await entriesRepo.insertEntry(db, me, b, d("2024-10-08"), null);
    expect(await entriesRepo.findFirstEntryDate(db, me)).toBe("2024-10-08");
    expect(await entriesRepo.findFirstEntryDate(db, me, a.id)).toBe(
      "2024-11-03",
    );
    expect(await entriesRepo.findFirstEntryDate(db, me, "x")).toBeNull();
  });

  it("findLatestQuantity はいちばん新しい記録の量を返す", async () => {
    const me = await createUser();
    const habit = (await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, incrementHabit()),
    ))!;
    expect(await entriesRepo.findLatestQuantity(db, me, habit.id)).toBeNull();
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-02"), 3);
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-02"), 2.5);
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-01"), 9);
    expect(await entriesRepo.findLatestQuantity(db, me, habit.id)).toBe(2.5);
  });

  it("mergeSameDayEntries は同じ日の複数行を1行にまとめ、量を合計する", async () => {
    const me = await createUser();
    const habit = (await habitsRepo.findHabit(
      db,
      me,
      await createHabit(me, incrementHabit()),
    ))!;
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-01"), 3.2);
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-01"), 1.5);
    await entriesRepo.insertEntry(db, me, habit, d("2024-11-02"), 2);
    await entriesRepo.mergeSameDayEntries(db, me, habit.id);
    expect(await entriesOf(habit.id)).toEqual([
      expect.objectContaining({ date: "2024-11-01", quantity: 4.7 }),
      expect.objectContaining({ date: "2024-11-02", quantity: 2 }),
    ]);
  });
});

describe("settings repository", () => {
  it("ensureSettings は既定値の行を作り、2回目は何もしない", async () => {
    const me = await createUser();
    await settingsRepo.updateSettings(db, me, { dayStartHour: 2 });
    await settingsRepo.ensureSettings(db, me);
    expect(await settingsRepo.findSettings(db, me)).toMatchObject({
      timezone: "Asia/Tokyo",
      weekStart: "mon",
      dayStartHour: 2,
      reminderTime: null,
    });
  });

  it("リマインドの時刻は HH:MM で返す", async () => {
    const me = await createUser();
    const updated = await settingsRepo.updateSettings(db, me, {
      reminderTime: "21:00",
    });
    expect(updated?.reminderTime).toBe("21:00");
  });
});
