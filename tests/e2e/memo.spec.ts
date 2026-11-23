/**
 * ⑨ メモ：書く・⑨-b 書く・⑨-d 閉じるとき（下書き）。
 * 下部タブの「書く」から開き、狛犬のお題のカテゴリで書いて送る。
 */
import { addDays } from "../../src/domain/date";
import { monthsBefore } from "../../src/domain/memo";
import { expect, test } from "./fixtures";
import {
  createMemo,
  createMemoCategories,
  draftOf,
  memosOf,
  todayOf,
} from "./support/db";

test("はじめて開くと既定のカテゴリができ、お題のカテゴリで書いて送れる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);

  await page.goto("/record/today");
  await page
    .getByRole("navigation", { name: "メイン" })
    .getByRole("link", { name: "書く" })
    .click();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(
    page.getByText(/今日よかったこと、\s*3つ教えて。（1つめ）/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /よかったことを書く（今日 0\/3）/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "メモを書く" }).click();
  await expect(page).toHaveURL(/\/memo\/new/);
  // 下部タブは出さない
  await expect(page.getByRole("navigation", { name: "メイン" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "よかったこと" })).toBeChecked();
  await page
    .getByLabel("メモの本文")
    .fill("  朝の散歩で、金木犀の匂いがした  ");
  await expect(page.getByText("15字")).toBeVisible();
  await page.getByRole("button", { name: "送る" }).click();

  await expect(page).toHaveURL(/\/memo$/);
  await expect(
    page.getByText(/今日よかったこと、\s*3つ教えて。（2つめ）/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /よかったことを書く（今日 1\/3）/ }),
  ).toBeVisible();
  const saved = await memosOf(user.id);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    date: today,
    body: "朝の散歩で、金木犀の匂いがした",
  });
});

test("書いている途中でキャンセルすると下書きに保存でき、続きを書いて送ると下書きは消える", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  await createMemoCategories(user.id, [{ name: "ぼやき" }]);

  await page.goto("/memo/new");
  await page.getByLabel("メモの本文").fill("電車が遅れた");
  await page.getByRole("button", { name: "キャンセル" }).click();
  const sheet = page.getByRole("dialog", { name: "下書きに保存しますか？" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "下書きに保存" }).click();

  await expect(page).toHaveURL(/\/memo$/);
  expect(await draftOf(user.id)).toMatchObject({ body: "電車が遅れた" });
  await page
    .getByRole("link", { name: /下書き：ぼやき ・ 今日の書きかけ/ })
    .click();
  await expect(page.getByLabel("メモの本文")).toHaveValue("電車が遅れた");
  await page.getByLabel("メモの本文").fill("電車が遅れた。寒い。");
  await page.getByRole("button", { name: "送る" }).click();

  await expect(page).toHaveURL(/\/memo$/);
  expect(await draftOf(user.id)).toBeNull();
  expect((await memosOf(user.id)).map((m) => m.body)).toEqual([
    "電車が遅れた。寒い。",
  ]);
});

test("カレンダーで過去の日を選んで書ける。1年前の今日のメモが出る", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  const [good] = await createMemoCategories(user.id, [
    { name: "よかったこと", dailyTarget: 1 },
  ]);
  const yearAgo = monthsBefore(today, 12);
  await createMemo(user.id, {
    date: yearAgo,
    body: "布団を干した",
    categoryId: good,
  });

  await page.goto("/memo");
  await expect(
    page.getByRole("region", { name: /前の今日の自分|あの日の自分/ }),
  ).toContainText("布団を干した");

  await page.goto("/memo/new");
  await page.getByRole("button", { name: /日付を選ぶ/ }).click();
  const calendar = page.getByRole("dialog");
  const yesterday = addDays(today, -1);
  const [, m, d] = yesterday.split("-").map(Number);
  if (yesterday.slice(0, 7) !== today.slice(0, 7)) {
    await calendar.getByRole("button", { name: "前の月" }).click();
  }
  await calendar
    .getByRole("button", { name: `${m}月${d}日`, exact: true })
    .click();
  await expect(
    page.getByText(`${m}月${d}日のメモとして残ります`),
  ).toBeVisible();
  await page.getByLabel("メモの本文").fill("昨日のこと");
  await page.getByRole("button", { name: "送る" }).click();

  await expect(page).toHaveURL(/\/memo$/);
  const saved = await memosOf(user.id);
  expect(saved.find((x) => x.body === "昨日のこと")?.date).toBe(yesterday);
});
