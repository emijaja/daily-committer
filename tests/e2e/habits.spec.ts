/**
 * 習慣の追加 → 記録（implementation-plan.md 3-4）
 * ④ → ⑤-a で習慣を作る → ①に出て記録できる。
 */
import { expect, test } from "./fixtures";
import { entriesOf, habitsOf, todayOf } from "./support/db";

test("④ から ⑤-a で作った習慣が ① に出て、記録できる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser();

  // ④：まだ習慣がない
  await page.goto("/habits");
  await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();
  await page.getByRole("link", { name: "習慣を追加" }).click();

  // ⑤-a：毎日・チェックのみの習慣を作る
  await expect(page.getByRole("heading", { name: "New Habit" })).toBeVisible();
  await page.getByRole("textbox", { name: "名前" }).fill("ストレッチ");
  await expect(page.getByRole("radio", { name: "毎日" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "チェックのみ" })).toBeChecked();
  await page.getByRole("button", { name: "習慣を追加する" }).click();

  // 作ったあとは ④ に戻り、一覧に出る
  await expect(page).toHaveURL(/\/habits$/);
  await expect(
    page.getByRole("list", { name: "毎日" }).getByRole("link", {
      name: /ストレッチ/,
    }),
  ).toBeVisible();
  await expect.poll(async () => (await habitsOf(user.id)).length).toBe(1);

  // ①-a：作った習慣が出て、□で記録できる
  await page
    .getByRole("navigation", { name: "メイン" })
    .getByRole("link", { name: "記録" })
    .click();
  await expect(page).toHaveURL(/\/record\/today$/);
  const row = page
    .getByRole("list", { name: "今日の習慣" })
    .getByRole("checkbox", { name: "ストレッチ" });
  await expect(row).not.toBeChecked();
  await row.click();
  await expect(row).toBeChecked();
  await expect(page.getByRole("link", { name: "今日 1/1" })).toBeVisible();

  await expect
    .poll(async () => (await entriesOf(user.id)).map((e) => e.date))
    .toEqual([todayOf(user)]);

  // 読み込み直しても記録が残っている
  await page.reload();
  await expect(
    page
      .getByRole("list", { name: "今日の習慣" })
      .getByRole("checkbox", { name: "ストレッチ" }),
  ).toBeChecked();
});
