/**
 * 記録 → 振り返り → 修正（implementation-plan.md 3-4）
 * ①で記録 → ⑥-a に草と件数が出る → ② で過去の日を直す → ①・⑥ に反映される。
 */
import type { Page } from "@playwright/test";
import { addDays } from "../../src/domain/date";
import type { LogicalDate } from "../../src/domain/types";
import { expect, test } from "./fixtures";
import { createHabit, entriesOf, todayOf } from "./support/db";

/** ⑥-a の年間の草で、その日のマスに草が生えているか（レベル 1〜3 の色） */
function grassCell(page: Page, date: LogicalDate) {
  return page.locator(`[data-date="${date}"]`);
}

/** 年をまたいでも見たい日が出るよう、その日の年の振り返りを開く */
async function openReview(page: Page, date: LogicalDate) {
  await page.goto(`/review?year=${date.slice(0, 4)}`);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
}

test("①で記録した内容が ⑥ に出て、② で過去の日を直すと ①・⑥ に反映される", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  const yesterday = addDays(today, -1);
  await createHabit(user.id, {
    name: "読書",
    createdOn: addDays(today, -7),
    sortOrder: 0,
  });
  await createHabit(user.id, {
    name: "筋トレ",
    createdOn: addDays(today, -7),
    quantity: { unit: "回", target: 30, mode: "total" },
    sortOrder: 1,
  });

  // ①-a：□をタップし、量の習慣はシートで記録する
  await page.goto("/record/today");
  const list = page.getByRole("list", { name: "今日の習慣" });
  await expect(page.getByRole("link", { name: "今日 0/2" })).toBeVisible();

  await list.getByRole("checkbox", { name: "読書" }).click();
  await expect(list.getByRole("checkbox", { name: "読書" })).toBeChecked();

  await list.getByRole("button", { name: "筋トレを記録" }).click();
  const sheet = page.getByRole("dialog", { name: "筋トレ" });
  await sheet.getByRole("button", { name: "+10" }).click();
  await sheet.getByRole("button", { name: "+5" }).click();
  await sheet.getByRole("button", { name: "15 回で記録する" }).click();
  await expect(sheet).toBeHidden();
  await expect(list.getByText("15", { exact: true })).toBeVisible();
  // 量の目標（30 回）にはまだ届かないので、完了は読書の1つ
  await expect(page.getByRole("link", { name: "今日 1/2" })).toBeVisible();

  await expect.poll(async () => (await entriesOf(user.id)).length).toBe(2);

  // ⑥-a：今日の草と件数
  await openReview(page, today);
  await expect(page.getByText("記録 2件")).toBeVisible();
  await expect(grassCell(page, today)).toHaveClass(/bg-grass-[1-3]/);
  await expect(grassCell(page, yesterday)).toHaveClass(/bg-grass-0/);

  // ②：昨日の記録を付ける（読書をチェック、筋トレを 30 回）
  await page.goto(`/review/${yesterday}`);
  await expect(page.getByRole("heading", { name: "Edit" })).toBeVisible();
  const dayList = page.getByRole("list", { name: "この日の習慣" });
  await dayList.getByRole("checkbox", { name: "読書" }).click();
  await expect(dayList.getByRole("checkbox", { name: "読書" })).toBeChecked();
  await dayList.getByRole("button", { name: "筋トレを記録" }).click();
  const daySheet = page.getByRole("dialog", { name: "筋トレ" });
  await daySheet.getByRole("button", { name: "目標の 30" }).click();
  await daySheet.getByRole("button", { name: "30 回で記録する" }).click();
  await expect(daySheet).toBeHidden();

  await expect
    .poll(async () =>
      (await entriesOf(user.id))
        .filter((e) => e.date === yesterday)
        .map((e) => e.quantity),
    )
    .toEqual(expect.arrayContaining([null, 30]));

  // ①-a：昨日の分で読書の連続が 2日になる
  await page.goto("/record/today");
  await expect(
    page
      .getByRole("list", { name: "今日の習慣" })
      .getByText("2日連続", { exact: false }),
  ).toBeVisible();

  // ⑥-a：昨日の草と件数（年をまたぐ日は、それぞれの年で確かめる）
  if (yesterday.slice(0, 4) === today.slice(0, 4)) {
    await openReview(page, today);
    await expect(page.getByText("記録 4件")).toBeVisible();
  } else {
    await openReview(page, yesterday);
    await expect(page.getByText("記録 2件")).toBeVisible();
  }
  await expect(grassCell(page, yesterday)).toHaveClass(/bg-grass-[1-3]/);

  // ②：昨日の読書を取り消すと、①の連続が 1日に戻る
  await page.goto(`/review/${yesterday}`);
  await dayList.getByRole("checkbox", { name: "読書" }).click();
  await expect(
    dayList.getByRole("checkbox", { name: "読書" }),
  ).not.toBeChecked();
  await expect
    .poll(
      async () =>
        (await entriesOf(user.id)).filter((e) => e.date === yesterday).length,
    )
    .toBe(1);
  await page.goto("/record/today");
  await expect(
    page.getByRole("list", { name: "今日の習慣" }).getByText("1日連続"),
  ).toBeVisible();
});
