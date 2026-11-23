import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { createHabit, createUser, d } from "@/server/testing/factories";
import * as categoriesRepo from "./memo-categories";
import * as draftsRepo from "./memo-drafts";
import * as memosRepo from "./memos";

const category = (name: string, dailyTarget: number | null = null) => ({
  name,
  prompt: null,
  dailyTarget,
});

describe("memo_categories repository", () => {
  it("足した順に並び順の最後へ足し、自分のものだけを読み書きする", async () => {
    const me = await createUser();
    const other = await createUser();
    const [a, b] = await categoriesRepo.insertCategories(db, me, [
      category("よかったこと", 3),
      category("ぼやき"),
    ]);
    const [c] = await categoriesRepo.insertCategories(db, me, [
      category("気づき"),
    ]);
    expect([a!.sortOrder, b!.sortOrder, c!.sortOrder]).toEqual([0, 1, 2]);
    expect(
      (await categoriesRepo.listCategories(db, me)).map((x) => x.name),
    ).toEqual(["よかったこと", "ぼやき", "気づき"]);

    expect(await categoriesRepo.findCategory(db, other, a!.id)).toBeNull();
    expect(
      await categoriesRepo.updateCategory(db, other, a!.id, category("x")),
    ).toBeNull();
    expect(await categoriesRepo.deleteCategory(db, other, a!.id)).toBe(false);
    expect(
      (
        await categoriesRepo.updateCategory(
          db,
          me,
          a!.id,
          category("嬉しい", 1),
        )
      )?.dailyTarget,
    ).toBe(1);
  });

  it("カテゴリを消してもメモはカテゴリなしで残る", async () => {
    const me = await createUser();
    const [cat] = await categoriesRepo.insertCategories(db, me, [
      category("ぼやき"),
    ]);
    const memoId = await memosRepo.insertMemo(db, me, {
      date: d("2026-11-21"),
      body: "雨",
      categoryId: cat!.id,
    });
    expect(await categoriesRepo.deleteCategory(db, me, cat!.id)).toBe(true);
    expect((await memosRepo.findMemo(db, me, memoId))?.categoryId).toBeNull();
  });
});

describe("memos repository（ふつうのメモ）", () => {
  it("日付の新しい順・同じ日は書いた順の新しい順。期間・カテゴリ・習慣へのひとことで絞れる", async () => {
    const me = await createUser();
    const habitId = await createHabit(me);
    const [cat] = await categoriesRepo.insertCategories(db, me, [
      category("よかったこと"),
    ]);
    const first = await memosRepo.insertMemo(db, me, {
      date: d("2026-11-20"),
      body: "1つめ",
      categoryId: cat!.id,
    });
    const second = await memosRepo.insertMemo(db, me, {
      date: d("2026-11-20"),
      body: "2つめ",
      categoryId: null,
    });
    const older = await memosRepo.insertMemo(db, me, {
      date: d("2026-10-01"),
      body: "前の月",
      categoryId: cat!.id,
    });
    await memosRepo.upsertNote(db, me, habitId, d("2026-11-21"), "ひとこと");

    const all = await memosRepo.listMemos(db, me);
    expect(all.map((m) => m.body)).toEqual([
      "ひとこと",
      "2つめ",
      "1つめ",
      "前の月",
    ]);
    expect(all[0]?.habitName).toBe("読書");

    const nov = await memosRepo.listMemos(db, me, {
      from: d("2026-11-01"),
      to: d("2026-11-30"),
      excludeHabitNotes: true,
    });
    expect(nov.map((m) => m.id)).toEqual([second, first]);
    expect(
      (await memosRepo.listMemos(db, me, { categoryId: cat!.id })).map(
        (m) => m.id,
      ),
    ).toEqual([first, older]);
    expect(
      (await memosRepo.listMemos(db, me, { categoryId: null })).map(
        (m) => m.body,
      ),
    ).toEqual(["ひとこと", "2つめ"]);
  });

  it("自分のメモだけを書き換え・削除できる。習慣へのひとことにはカテゴリを付けない", async () => {
    const me = await createUser();
    const other = await createUser();
    const habitId = await createHabit(me);
    const [cat] = await categoriesRepo.insertCategories(db, me, [
      category("ぼやき"),
    ]);
    const memoId = await memosRepo.insertMemo(db, me, {
      date: d("2026-11-21"),
      body: "前",
      categoryId: null,
    });
    const values = {
      date: d("2026-11-20"),
      body: "後",
      categoryId: cat!.id,
    };
    expect(await memosRepo.updateMemo(db, other, memoId, values)).toBe(false);
    expect(await memosRepo.updateMemo(db, me, memoId, values)).toBe(true);
    expect(await memosRepo.findMemo(db, me, memoId)).toMatchObject(values);

    await memosRepo.upsertNote(db, me, habitId, d("2026-11-21"), "ひとこと");
    const [note] = await memosRepo.listMemos(db, me, { from: d("2026-11-21") });
    expect(await memosRepo.updateMemo(db, me, note!.id, values)).toBe(true);
    expect(await memosRepo.findMemo(db, me, note!.id)).toMatchObject({
      body: "後",
      categoryId: null,
      habitId,
    });

    expect(await memosRepo.deleteMemo(db, other, memoId)).toBe(false);
    expect(await memosRepo.deleteMemo(db, me, memoId)).toBe(true);
    expect(await memosRepo.findMemo(db, me, memoId)).toBeNull();
  });
});

describe("memo_drafts repository", () => {
  it("ユーザーごとに1つで、保存すると上書きする", async () => {
    const me = await createUser();
    expect(await draftsRepo.findDraft(db, me)).toBeNull();
    await draftsRepo.upsertDraft(db, me, {
      date: d("2026-11-21"),
      categoryId: null,
      body: "書きかけ",
    });
    await draftsRepo.upsertDraft(db, me, {
      date: d("2026-11-20"),
      categoryId: null,
      body: "書き直し",
    });
    expect(await draftsRepo.findDraft(db, me)).toMatchObject({
      date: "2026-11-20",
      body: "書き直し",
    });
    await draftsRepo.deleteDraft(db, me);
    expect(await draftsRepo.findDraft(db, me)).toBeNull();
  });
});
