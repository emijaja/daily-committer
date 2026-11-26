/**
 * ⑨-d すべてのメモ・⑨-e メモを開く（編集・削除）。
 */
import { addDays } from "../../src/domain/date";
import { expect, test } from "./fixtures";
import {
  createMemo,
  createMemoCategories,
  memosOf,
  todayOf,
} from "./support/db";

test("月ごとにメモを並べ、カテゴリで絞り込める。開いて編集・削除できる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  const [good, grumble] = await createMemoCategories(user.id, [
    { name: "よかったこと", dailyTarget: 3 },
    { name: "ぼやき" },
  ]);
  await createMemo(user.id, {
    date: today,
    body: "同僚に「助かった」と言われた",
    categoryId: good,
  });
  await createMemo(user.id, {
    date: today,
    body: "会議が長すぎる",
    categoryId: grumble,
  });

  await page.goto("/memo");
  await page.getByRole("link", { name: "すべてのメモ" }).click();
  await expect(page).toHaveURL(/\/memo\/all/);
  await expect(page.getByText("2件", { exact: true }).first()).toBeVisible();
  const day = page.getByRole("region", {
    name: new RegExp(
      `${Number(today.slice(5, 7))}月${Number(today.slice(8))}日`,
    ),
  });
  await expect(day.getByRole("button")).toHaveCount(2);

  // カテゴリで絞り込む
  await page
    .getByRole("navigation", { name: "カテゴリで絞り込む" })
    .getByRole("link", { name: "ぼやき" })
    .click();
  await expect(day.getByRole("button")).toHaveCount(1);
  await expect(day).toContainText("会議が長すぎる");

  // 開いて編集する
  await day.getByRole("button", { name: /会議が長すぎる/ }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("会議が長すぎる");
  await expect(modal.getByText("7字")).toBeVisible();
  await modal.getByRole("button", { name: "編集する" }).click();
  await expect(page).toHaveURL(/\/memo\/[^/]+\/edit/);
  await page
    .getByLabel("メモの本文")
    .fill("会議が長すぎる…。結論、メールでよかった");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page).toHaveURL(/\/memo\/all\?month=/);
  expect((await memosOf(user.id)).map((m) => m.body)).toContain(
    "会議が長すぎる…。結論、メールでよかった",
  );

  // 削除する
  await page.getByRole("button", { name: /同僚に/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "削除" }).click();
  await expect(page.getByText("メモを削除しました")).toBeVisible();
  await expect(page.getByRole("button", { name: /同僚に/ })).toHaveCount(0);
  expect((await memosOf(user.id)).map((m) => m.body)).toEqual([
    "会議が長すぎる…。結論、メールでよかった",
  ]);
});

test("前の月に移れ、次の月は今月まで。メモのない月は空の表示", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  const lastMonth = addDays(`${today.slice(0, 7)}-01` as typeof today, -1);
  await createMemo(user.id, { date: lastMonth, body: "先月のメモ" });

  await page.goto("/memo/all");
  await expect(page.getByLabel("次の月")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByText("この月のメモはまだありません")).toBeVisible();
  await page.getByRole("link", { name: "前の月" }).click();
  await expect(page.getByText("先月のメモ")).toBeVisible();
});
