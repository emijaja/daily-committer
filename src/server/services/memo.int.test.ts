import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { insertMemo, upsertNote } from "@/server/repositories/memos";
import { createHabit, createUser, d } from "@/server/testing/factories";
import {
  createCategory,
  createMemo,
  deleteCategory,
  deleteMemo,
  discardDraft,
  ensureCategories,
  getMemoHomeView,
  getMemoListView,
  getMemoWriteView,
  saveDraft,
  updateCategory,
  updateMemo,
} from "./memo";

/** Asia/Tokyo（既定）で 2026-11-21 21:00 */
const now = new Date("2026-11-21T12:00:00Z");
const today = d("2026-11-21");

describe("ensureCategories", () => {
  it("はじめては既定のカテゴリを作り、2回目は作らない", async () => {
    const me = await createUser();
    const [first, second] = await Promise.all([
      ensureCategories(me),
      ensureCategories(me),
    ]);
    expect(first.map((c) => c.name)).toEqual([
      "よかったこと",
      "ぼやき",
      "気づき",
    ]);
    expect(second.map((c) => c.id)).toEqual(first.map((c) => c.id));
    expect(first[0]?.dailyTarget).toBe(3);
  });

  it("カテゴリをすべて消しても、メモがあれば作り直さない", async () => {
    const me = await createUser();
    const categories = await ensureCategories(me);
    await createMemo(me, { categoryId: categories[0]!.id, body: "a" }, now);
    for (const c of categories) await deleteCategory(me, c.id);
    expect(await ensureCategories(me)).toEqual([]);
  });
});

describe("getMemoHomeView", () => {
  it("お題・今日の件数・目標の達成・過去のメモ・下書きをまとめる", async () => {
    const me = await createUser();
    const [good, grumble] = await ensureCategories(me);
    const habitId = await createHabit(me);
    for (const date of ["2026-11-19", "2026-11-20"]) {
      for (let i = 0; i < 3; i++) {
        await insertMemo(db, me, {
          date: d(date),
          body: `${date}-${i}`,
          categoryId: good!.id,
        });
      }
    }
    await insertMemo(db, me, {
      date: d("2025-11-21"),
      body: "1年前",
      categoryId: grumble!.id,
    });
    await createMemo(me, { categoryId: good!.id, body: "今日1" }, now);
    await createMemo(me, { categoryId: good!.id, body: "今日2" }, now);
    await upsertNote(db, me, habitId, today, "ひとこと");
    await saveDraft(me, { categoryId: grumble!.id, body: "書きかけ" }, now);

    const view = await getMemoHomeView(me, now);
    expect(view.today).toBe(today);
    expect(view.clock).toBe("21:00");
    expect(view.speech).toMatchObject({
      expression: "happy",
      text: "今日よかったこと、3つ教えて。（3つめ）",
      meta: "よかったこと あと1つ",
    });
    expect(view.todayCounts).toEqual({ [good!.id]: 2 });
    expect(view.todayTotal).toBe(3);
    expect(view.targets).toHaveLength(1);
    expect(view.targets[0]).toMatchObject({ current: 2, remaining: 1 });
    expect(view.pastMemos[0]).toMatchObject({
      heading: "1年前の今日の自分",
      memo: { body: "1年前", tag: "ぼやき" },
    });
    expect(view.pastMemos.map((p) => p.memo.body)).not.toContain("今日1");
    expect(view.draft).toEqual({ date: today, categoryName: "ぼやき" });
  });
});

describe("getMemoWriteView", () => {
  it("新しく書く：お題のカテゴリと今日。未来の日付は今日にする。カレンダーに日ごとの状態", async () => {
    const me = await createUser();
    const [good, grumble] = await ensureCategories(me);
    for (let i = 0; i < 3; i++) {
      await insertMemo(db, me, {
        date: d("2026-11-20"),
        body: `${i}`,
        categoryId: good!.id,
      });
    }
    await insertMemo(db, me, {
      date: d("2026-11-19"),
      body: "x",
      categoryId: grumble!.id,
    });

    const view = await getMemoWriteView(me, { date: d("2026-12-01") }, now);
    expect(view.initial).toEqual({
      date: today,
      categoryId: good!.id,
      body: "",
    });
    expect(view.memo).toBeNull();
    const status = new Map(view.calendar.map((c) => [c.date, c.status]));
    expect(status.get(d("2026-11-20"))).toBe("achieved");
    expect(status.get(d("2026-11-19"))).toBe("written");
    expect(status.get(d("2026-11-18"))).toBe("none");
    expect(view.calendar[0]?.date).toBe("2025-11-01");
    expect(view.calendar.at(-1)?.date).toBe(today);

    const chosen = await getMemoWriteView(
      me,
      { date: d("2026-11-18"), categoryId: grumble!.id },
      now,
    );
    expect(chosen.initial).toMatchObject({
      date: "2026-11-18",
      categoryId: grumble!.id,
    });
  });

  it("下書きから続きを書く・メモを編集する。他人のメモは見つからない", async () => {
    const me = await createUser();
    const other = await createUser();
    const [good] = await ensureCategories(me);
    await saveDraft(
      me,
      { date: d("2026-11-20"), categoryId: good!.id, body: "書きかけ" },
      now,
    );
    const fromDraft = await getMemoWriteView(me, { draft: true }, now);
    expect(fromDraft).toMatchObject({
      fromDraft: true,
      initial: { date: "2026-11-20", categoryId: good!.id, body: "書きかけ" },
    });

    const memoId = await createMemo(
      me,
      { categoryId: good!.id, body: "書いた" },
      now,
    );
    const edit = await getMemoWriteView(me, { memoId }, now);
    expect(edit.memo).toMatchObject({
      id: memoId,
      body: "書いた",
      tag: "よかったこと",
    });
    await expect(getMemoWriteView(other, { memoId }, now)).rejects.toThrow(
      "メモが見つかりません",
    );
  });
});

describe("メモを書く・書き換える", () => {
  it("下書きから送ると下書きを消す。空・未来の日・他人のカテゴリは拒否する", async () => {
    const me = await createUser();
    const other = await createUser();
    const [good] = await ensureCategories(me);
    const [theirs] = await ensureCategories(other);
    await saveDraft(me, { categoryId: null, body: "書きかけ" }, now);
    await createMemo(
      me,
      { categoryId: good!.id, body: " 送った ", fromDraft: true },
      now,
    );
    expect((await getMemoHomeView(me, now)).draft).toBeNull();

    await expect(
      createMemo(me, { categoryId: null, body: "  " }, now),
    ).rejects.toThrow("メモを書いてください");
    await expect(
      createMemo(
        me,
        { date: d("2026-11-22"), categoryId: null, body: "a" },
        now,
      ),
    ).rejects.toThrow("未来の日付には書けません");
    await expect(
      createMemo(me, { categoryId: theirs!.id, body: "a" }, now),
    ).rejects.toThrow("カテゴリが見つかりません");
  });

  it("書き換え、本文を空にすると消す。他人のメモは書き換え・削除できない", async () => {
    const me = await createUser();
    const other = await createUser();
    const memoId = await createMemo(me, { categoryId: null, body: "前" }, now);
    const values = { date: d("2026-11-20"), categoryId: null, body: "後" };
    await expect(updateMemo(other, memoId, values, now)).rejects.toThrow(
      "メモが見つかりません",
    );
    expect(await updateMemo(me, memoId, values, now)).toBe(memoId);
    expect(
      await updateMemo(me, memoId, { ...values, body: " " }, now),
    ).toBeNull();
    await expect(deleteMemo(me, memoId)).rejects.toThrow(
      "メモが見つかりません",
    );
  });

  it("下書きを空で保存すると消え、捨てられる", async () => {
    const me = await createUser();
    await saveDraft(me, { categoryId: null, body: "a" }, now);
    await saveDraft(me, { categoryId: null, body: " " }, now);
    expect((await getMemoHomeView(me, now)).draft).toBeNull();
    await saveDraft(me, { categoryId: null, body: "b" }, now);
    await discardDraft(me);
    expect((await getMemoHomeView(me, now)).draft).toBeNull();
  });
});

describe("カテゴリ", () => {
  it("足す・書き換える・消す。名前が空・目標が0は拒否する", async () => {
    const me = await createUser();
    await ensureCategories(me);
    const created = await createCategory(me, {
      name: " 感謝 ",
      prompt: " ",
      dailyTarget: 1,
    });
    expect(created).toMatchObject({
      name: "感謝",
      prompt: null,
      dailyTarget: 1,
      sortOrder: 3,
    });
    const updated = await updateCategory(me, created.id, {
      name: "感謝",
      prompt: "ありがとうを1つ",
      dailyTarget: null,
    });
    expect(updated.prompt).toBe("ありがとうを1つ");
    await expect(
      createCategory(me, { name: " ", prompt: null, dailyTarget: null }),
    ).rejects.toThrow();
    await expect(
      createCategory(me, { name: "a", prompt: null, dailyTarget: 0 }),
    ).rejects.toThrow();
    await deleteCategory(me, created.id);
    await expect(deleteCategory(me, created.id)).rejects.toThrow(
      "カテゴリが見つかりません",
    );
  });
});

describe("getMemoListView", () => {
  it("月とカテゴリで絞り、日ごとにまとめる。今月より先には進めない", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);
    const [good, grumble] = await ensureCategories(me);
    await insertMemo(db, me, {
      date: d("2026-11-20"),
      body: "a",
      categoryId: good!.id,
    });
    await insertMemo(db, me, {
      date: d("2026-11-20"),
      body: "b",
      categoryId: grumble!.id,
    });
    await insertMemo(db, me, {
      date: d("2026-11-03"),
      body: "c",
      categoryId: good!.id,
    });
    await insertMemo(db, me, {
      date: d("2026-09-10"),
      body: "d",
      categoryId: good!.id,
    });
    await upsertNote(db, me, habitId, today, "ひとこと");

    const view = await getMemoListView(me, {}, now);
    expect(view).toMatchObject({
      year: 2026,
      month: 11,
      count: 4,
      canNext: false,
      canPrev: true,
    });
    expect(view.days.map((x) => [x.date, x.memos.map((m) => m.body)])).toEqual([
      ["2026-11-21", ["ひとこと"]],
      ["2026-11-20", ["b", "a"]],
      ["2026-11-03", ["c"]],
    ]);
    expect(view.days[0]?.memos[0]).toMatchObject({
      tag: "読書",
      isHabitNote: true,
    });

    const filtered = await getMemoListView(me, { categoryId: good!.id }, now);
    expect(filtered.count).toBe(2);
    expect(filtered.categoryId).toBe(good!.id);

    const sep = await getMemoListView(me, { month: "2026-09" }, now);
    expect(sep).toMatchObject({
      month: 9,
      count: 1,
      canPrev: false,
      canNext: true,
    });
    expect((await getMemoListView(me, { month: "2027-01" }, now)).month).toBe(
      11,
    );
  });
});
