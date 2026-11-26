import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/server/testing/factories";

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

const { revalidatePath } = await import("next/cache");
const {
  createCategoryAction,
  createMemoAction,
  deleteCategoryAction,
  deleteMemoAction,
  discardDraftAction,
  saveDraftAction,
  updateCategoryAction,
  updateMemoAction,
} = await import("./memo");
const { getMemoHomeView, ensureCategories } =
  await import("@/server/services/memo");

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  // 東京で 2026-11-21 21:00
  vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
  auth.userId = await createUser({ timezone: "Asia/Tokyo", dayStartHour: 4 });
  return () => vi.useRealTimers();
});

describe("メモの Server Actions", () => {
  it("送る → 書き換える → 消す。メモの画面を更新する", async () => {
    const [good] = await ensureCategories(auth.userId);
    const created = await createMemoAction({
      categoryId: good!.id,
      body: "朝の散歩",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(revalidatePath).toHaveBeenCalledWith("/memo");
    expect(revalidatePath).toHaveBeenCalledWith("/memo/all");

    expect(
      await updateMemoAction({
        memoId: created.data.memoId,
        date: "2026-11-20",
        categoryId: null,
        body: "朝の散歩（昨日）",
      }),
    ).toEqual({ ok: true, data: { deleted: false } });
    expect(await deleteMemoAction({ memoId: created.data.memoId })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await deleteMemoAction({ memoId: created.data.memoId })).toEqual({
      ok: false,
      error: "メモが見つかりません",
    });
  });

  it("未来の日付・不正な ID・空の本文はエラーで返す", async () => {
    expect(
      await createMemoAction({
        date: "2026-11-22",
        categoryId: null,
        body: "a",
      }),
    ).toEqual({ ok: false, error: "未来の日付には書けません" });
    expect(
      await createMemoAction({ categoryId: "x", body: "a" }),
    ).toMatchObject({ ok: false });
    expect(await createMemoAction({ categoryId: null, body: " " })).toEqual({
      ok: false,
      error: "メモを書いてください",
    });
  });

  it("下書きを保存・捨てる。下書きから送ると下書きが消える", async () => {
    await saveDraftAction({ categoryId: null, body: "書きかけ" });
    expect((await getMemoHomeView(auth.userId)).draft).not.toBeNull();
    await discardDraftAction();
    expect((await getMemoHomeView(auth.userId)).draft).toBeNull();

    await saveDraftAction({ categoryId: null, body: "書きかけ" });
    await createMemoAction({
      categoryId: null,
      body: "送った",
      fromDraft: true,
    });
    expect((await getMemoHomeView(auth.userId)).draft).toBeNull();
  });

  it("カテゴリを足す・書き換える・消す。名前が空ならメッセージを返す", async () => {
    const created = await createCategoryAction({
      name: "感謝",
      prompt: null,
      dailyTarget: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      await updateCategoryAction({
        categoryId: created.data.categoryId,
        name: "感謝",
        prompt: "ありがとうを1つ",
        dailyTarget: null,
      }),
    ).toEqual({ ok: true, data: undefined });
    expect(
      await createCategoryAction({
        name: " ",
        prompt: null,
        dailyTarget: null,
      }),
    ).toEqual({ ok: false, error: "名前を入れてください" });
    expect(
      await deleteCategoryAction({ categoryId: created.data.categoryId }),
    ).toEqual({ ok: true, data: undefined });
  });
});
