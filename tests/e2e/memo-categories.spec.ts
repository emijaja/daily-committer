/**
 * ⑨-c カテゴリの追加・編集・削除。
 */
import { expect, test } from "./fixtures";
import {
  createMemo,
  createMemoCategories,
  memosOf,
  todayOf,
} from "./support/db";

test("書く画面の＋でカテゴリを足すと、書く画面に戻ってそのカテゴリを選べる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  await createMemoCategories(user.id, [{ name: "ぼやき" }]);

  await page.goto("/memo/new");
  await page.getByRole("link", { name: "カテゴリを足す" }).click();
  await expect(
    page.getByRole("heading", { name: "New Category" }),
  ).toBeVisible();
  // 名前が空なら保存できない
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("名前を入れてください")).toBeVisible();

  await page.getByLabel("名前").fill("感謝");
  await page.getByRole("radio", { name: "1日の目標あり" }).click();
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/memo\/new$/);
  // 目標がまだのカテゴリなので、お題のカテゴリとして選ばれている
  await expect(page.getByRole("radio", { name: "感謝" })).toBeChecked();
  await page.getByRole("radio", { name: "ぼやき" }).click();
  await expect(page.getByRole("radio", { name: "ぼやき" })).toBeChecked();
  await page.getByRole("radio", { name: "感謝" }).click();
  await expect(page.getByRole("radio", { name: "感謝" })).toBeChecked();
  await expect(page.getByText("今日の感謝、聞かせて。（1つめ）")).toBeVisible();
});

test("目標を変える・カテゴリを消す。消してもメモはカテゴリなしで残る", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const [good] = await createMemoCategories(user.id, [
    { name: "よかったこと", dailyTarget: 3 },
  ]);
  await createMemo(user.id, {
    date: todayOf(user),
    body: "朝の散歩",
    categoryId: good,
  });

  await page.goto("/memo");
  await page.getByRole("link", { name: "目標を変える" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit Category" }),
  ).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue("よかったこと");
  await page
    .getByRole("group", { name: "1日に書く数" })
    .getByRole("button", { name: /減らす|−|-/ })
    .click();
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(page.getByText("1日 2つ")).toBeVisible();

  await page.getByRole("link", { name: "目標を変える" }).click();
  await page.getByRole("button", { name: "このカテゴリを削除" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "削除する" })
    .click();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(page.getByText("目標の達成")).toHaveCount(0);
  expect(await memosOf(user.id)).toEqual([
    expect.objectContaining({ body: "朝の散歩", categoryId: null }),
  ]);
});
