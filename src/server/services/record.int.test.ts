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
  getRecordView,
  repeatLastQuantity,
  setQuantityTotal,
  toggleCheck,
} from "./record";
import { archiveHabit } from "./habits";
import { updateSettings } from "./settings";

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

describe("getRecordView", () => {
  // 2024-11-06（水）21:00 Asia/Tokyo。週は月曜始まり（11/4〜11/10）
  const now = new Date("2024-11-06T12:00:00Z");

  async function setup() {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit(), { sortOrder: 0 });
    const workout = await createHabit(me, totalHabit(), { sortOrder: 1 });
    const running = await createHabit(me, incrementHabit(), { sortOrder: 2 });
    const monthly = await createHabit(
      me,
      checkHabit({ name: "部屋の掃除", period: "monthly", timesPerPeriod: 2 }),
      { sortOrder: 3 },
    );
    await toggleCheck(me, reading, d("2024-11-06"));
    await setQuantityTotal(me, workout, d("2024-11-06"), 20);
    await addQuantity(me, running, d("2024-10-31"), 9); // 先週の分は数えない
    await addQuantity(me, running, d("2024-11-04"), 6);
    await addQuantity(me, running, d("2024-11-05"), 5);
    await toggleCheck(me, monthly, d("2024-11-02"));
    return { me, reading, workout, running, monthly };
  }

  it("今日・今週・今月の行と集計を、domain の計算で返す", async () => {
    const { me, reading, workout, running } = await setup();

    const daily = await getRecordView(me, "daily", now);
    expect(daily.today).toBe("2024-11-06");
    expect(daily.range).toEqual({ start: "2024-11-06", end: "2024-11-06" });
    expect(daily.rows.map((r) => [r.habit.id, r.progress.achieved])).toEqual([
      [reading, true],
      [workout, false],
    ]);
    expect(daily.rows[1]?.progress).toMatchObject({ current: 20, target: 30 });
    expect(daily.tabSummaries).toEqual({
      daily: { done: 1, total: 2 },
      weekly: { done: 1, total: 1 },
      monthly: { done: 0, total: 1 },
    });
    expect(daily.summary).toEqual({ done: 1, total: 2 });
    expect(daily.grumble?.expression).toBe("grumpy");

    const weekly = await getRecordView(me, "weekly", now);
    expect(weekly.range).toEqual({ start: "2024-11-04", end: "2024-11-10" });
    expect(weekly.rows[0]?.habit.id).toBe(running);
    expect(weekly.rows[0]?.progress).toMatchObject({
      current: 11,
      achieved: true,
    });
  });

  it("1日の切り替え時刻より前は、前の日として扱う", async () => {
    const { me } = await setup();
    // 11/7 3:30（Asia/Tokyo）は、切り替え 4:00 より前なので 11/6
    const view = await getRecordView(
      me,
      "daily",
      new Date("2024-11-06T18:30:00Z"),
    );
    expect(view.today).toBe("2024-11-06");
  });

  it("過去の習慣と他人の習慣は含めず、ぼやきを切っていれば null", async () => {
    const { me, workout } = await setup();
    await archiveHabit(me, workout, now);
    const other = await createUser();
    await createHabit(other);
    await updateSettings(me, { grumbleEnabled: false });

    const view = await getRecordView(me, "daily", now);
    expect(view.rows).toHaveLength(1);
    expect(view.grumble).toBeNull();
  });

  it("習慣がない期間は行が空で、ぼやきは null", async () => {
    const me = await createUser();
    const view = await getRecordView(me, "weekly", now);
    expect(view.rows).toEqual([]);
    expect(view.summary).toEqual({ done: 0, total: 0 });
    expect(view.grumble).toBeNull();
  });

  it("行に、その期間の記録と連続記録を入れる", async () => {
    const { me, running } = await setup();
    const weekly = await getRecordView(me, "weekly", now);
    const row = weekly.rows.find((r) => r.habit.id === running);
    // 先週（10/31）の分は入れない
    expect(row?.entries?.map((e) => [e.date, e.quantity])).toEqual([
      ["2024-11-04", 6],
      ["2024-11-05", 5],
    ]);
    // 先週は 9 km で未達成なので、今週の1週だけ
    expect(row?.streak).toEqual({ current: 1, endedLastPeriod: false });
  });
});

describe("getRecordView の連続記録のタグ（highlight）", () => {
  // 2024-11-06（水）21:00 Asia/Tokyo。週は月曜始まり
  const now = new Date("2024-11-06T12:00:00Z");

  async function checkDays(me: string, habitId: string, dates: string[]) {
    for (const date of dates) await toggleCheck(me, habitId, d(date));
  }

  it("日次：いまの連続が最も長い習慣を STREAK N で出す", async () => {
    const me = await createUser();
    const reading = await createHabit(me, checkHabit(), { sortOrder: 0 });
    const early = await createHabit(me, checkHabit({ name: "早起き" }), {
      sortOrder: 1,
    });
    // 読書：11/3〜11/6 の4日（今日を含む）。早起き：11/1〜11/5 の5日（今日は未でも途切れない）
    await checkDays(me, reading, [
      "2024-11-03",
      "2024-11-04",
      "2024-11-05",
      "2024-11-06",
    ]);
    await checkDays(me, early, [
      "2024-11-01",
      "2024-11-02",
      "2024-11-03",
      "2024-11-04",
      "2024-11-05",
    ]);

    const view = await getRecordView(me, "daily", now);
    expect(view.highlight).toEqual({
      tag: "STREAK 5",
      label: "早起き 5日連続",
    });
    expect(view.rows.map((r) => r.streak?.current)).toEqual([4, 5]);
  });

  it("同じ長さなら並び順が先の習慣を出す", async () => {
    const me = await createUser();
    const a = await createHabit(me, checkHabit({ name: "読書" }), {
      sortOrder: 0,
    });
    const b = await createHabit(me, checkHabit({ name: "早起き" }), {
      sortOrder: 1,
    });
    await checkDays(me, a, ["2024-11-05", "2024-11-06"]);
    await checkDays(me, b, ["2024-11-05", "2024-11-06"]);
    const view = await getRecordView(me, "daily", now);
    expect(view.highlight?.label).toBe("読書 2日連続");
  });

  it("連続が 2 未満なら null", async () => {
    const me = await createUser();
    const reading = await createHabit(me);
    await checkDays(me, reading, ["2024-11-06"]);
    const view = await getRecordView(me, "daily", now);
    expect(view.highlight).toBeNull();
  });

  it("週次：N WEEKS と週のペース", async () => {
    const me = await createUser();
    const running = await createHabit(me, incrementHabit());
    await addQuantity(me, running, d("2024-10-22"), 10); // 10/21 の週
    await addQuantity(me, running, d("2024-10-29"), 12); // 10/28 の週
    await addQuantity(me, running, d("2024-11-04"), 10); // 今週
    const view = await getRecordView(me, "weekly", now);
    expect(view.highlight).toEqual({
      tag: "3 WEEKS",
      label: "ランニング 週10kmペース",
    });
  });

  it("月次：N MONTHS と N か月連続", async () => {
    const me = await createUser();
    const budget = await createHabit(
      me,
      checkHabit({ name: "家計簿", period: "monthly", timesPerPeriod: 1 }),
      { createdOn: "2024-08-01" },
    );
    await checkDays(me, budget, ["2024-09-30", "2024-10-15"]);
    // 今月はまだでも途切れない
    const view = await getRecordView(me, "monthly", now);
    expect(view.highlight).toEqual({
      tag: "2 MONTHS",
      label: "家計簿 2か月連続",
    });
  });

  it("前の期間で途切れたら endedLastPeriod が true", async () => {
    const me = await createUser();
    const early = await createHabit(me, checkHabit({ name: "早起き" }));
    // 11/3・11/4 は記録、11/5（昨日）で途切れた
    await checkDays(me, early, ["2024-11-03", "2024-11-04"]);
    const view = await getRecordView(me, "daily", now);
    expect(view.rows[0]?.streak).toEqual({ current: 0, endedLastPeriod: true });
    expect(view.highlight).toBeNull();
  });

  it("それより前に途切れていたら endedLastPeriod は false", async () => {
    const me = await createUser();
    const early = await createHabit(me, checkHabit({ name: "早起き" }));
    await checkDays(me, early, ["2024-11-02", "2024-11-03"]);
    const view = await getRecordView(me, "daily", now);
    expect(view.rows[0]?.streak).toEqual({
      current: 0,
      endedLastPeriod: false,
    });
  });
});
