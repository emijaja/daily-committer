/**
 * 記録へのひとこと（⑩-a/b）と、量のシートの「前回」チップ（⑧-a）。
 * □／＋の長押しでひとことシートを開く。長押しでは記録の状態は変わらない。
 */
import type { Locator, Page } from "@playwright/test";
import { addDays } from "../../src/domain/date";
import { expect, test } from "./fixtures";
import { createHabit, entriesOf, todayOf } from "./support/db";

/** 指（マウス）で押したまま、長押しの時間（500ms）より長く待ってから離す */
async function longPress(page: Page, target: Locator) {
  await target.hover();
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
}

test("□の長押しで、未記録のままひとことを書け、書き直し・削除ができる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  await createHabit(user.id, {
    name: "早起き",
    createdOn: addDays(today, -7),
    sortOrder: 0,
  });

  await page.goto("/record/today");
  const list = page.getByRole("list", { name: "今日の習慣" });
  const box = list.getByRole("checkbox", { name: "早起き" });

  await longPress(page, box);
  const sheet = page.getByRole("dialog", { name: "Note" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("早起き ・ ")).toContainText("未記録");
  await expect(
    sheet.getByText("記録はつけずに、ひとことだけ残します"),
  ).toBeVisible();
  await sheet.getByLabel("早起きへのひとこと").fill("二度寝した。");
  await expect(sheet.getByText("6字")).toBeVisible();
  await sheet.getByRole("button", { name: "保存する" }).click();
  await expect(sheet).toBeHidden();

  // 長押しでは記録しない。行にはひとことの印だけが出る
  await expect(box).not.toBeChecked();
  await expect(list.getByText("（ひとことあり）")).toBeAttached();
  expect(await entriesOf(user.id)).toEqual([]);

  // 読み込み直しても残り、もう一度開くと書いた内容が入っている
  await page.reload();
  await expect(list.getByText("（ひとことあり）")).toBeAttached();
  await longPress(page, box);
  await expect(sheet.getByLabel("早起きへのひとこと")).toHaveValue(
    "二度寝した。",
  );

  // 削除すると印が消え、トーストの「取り消す」で戻せる
  await sheet.getByRole("button", { name: "削除" }).click();
  await expect(sheet).toBeHidden();
  await expect(list.getByText("（ひとことあり）")).not.toBeAttached();
  await page.getByRole("button", { name: "取り消す" }).click();
  await expect(list.getByText("（ひとことあり）")).toBeAttached();

  // 普通のタップは今までどおりチェック
  await box.click();
  await expect(box).toBeChecked();
});

test("＋の長押しでひとことを書き、量のシートの「前回」チップで前回の量を入れられる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();
  const today = todayOf(user);
  const yesterday = addDays(today, -1);
  await createHabit(user.id, {
    name: "筋トレ",
    createdOn: addDays(today, -7),
    quantity: { unit: "回", target: 30, mode: "total" },
    sortOrder: 0,
  });

  // ②：昨日を 25 回にする
  await page.goto(`/review/${yesterday}`);
  const dayList = page.getByRole("list", { name: "この日の習慣" });
  await dayList.getByRole("button", { name: "筋トレを記録" }).click();
  const daySheet = page.getByRole("dialog", { name: "筋トレ" });
  await daySheet.getByRole("button", { name: "+10" }).click();
  await daySheet.getByRole("button", { name: "+10" }).click();
  await daySheet.getByRole("button", { name: "+5" }).click();
  await daySheet.getByRole("button", { name: "25 回で記録する" }).click();
  await expect(daySheet).toBeHidden();
  await expect.poll(async () => (await entriesOf(user.id)).length).toBe(1);

  // ①-a：＋の長押しは記録せず、ひとことシートを開く
  await page.goto("/record/today");
  const list = page.getByRole("list", { name: "今日の習慣" });
  const add = list.getByRole("button", { name: "筋トレを記録" });
  await longPress(page, add);
  const note = page.getByRole("dialog", { name: "Note" });
  await note.getByLabel("筋トレへのひとこと").fill("腕がぱんぱん");
  await note.getByRole("button", { name: "保存する" }).click();
  await expect(note).toBeHidden();
  await expect(list.getByText("（ひとことあり）")).toBeAttached();
  expect(await entriesOf(user.id)).toHaveLength(1);

  // ⑧-a：「前回 25」チップで 25 回を入れて記録する
  await add.click();
  const sheet = page.getByRole("dialog", { name: "筋トレ" });
  await sheet.getByRole("button", { name: "前回 25" }).click();
  await sheet.getByRole("button", { name: "25 回で記録する" }).click();
  await expect(sheet).toBeHidden();
  await expect
    .poll(async () =>
      (await entriesOf(user.id))
        .filter((e) => e.date === today)
        .map((e) => e.quantity),
    )
    .toEqual([25]);
});
