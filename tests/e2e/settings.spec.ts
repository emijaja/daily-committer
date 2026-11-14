/**
 * ⑦ 設定の変更が反映されること
 * - 週の始まり → ①-b の曜日の並び
 * - ぼやきを表示 → ①-a のキャラの吹き出し
 */
import { addDays } from "../../src/domain/date";
import { expect, test } from "./fixtures";
import { createHabit, settingsOf, todayOf } from "./support/db";

test("⑦ で週の始まりとぼやきの表示を変えると ① に反映される", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser({ weekStart: "mon" });
  await createHabit(user.id, {
    name: "ランニング",
    period: "weekly",
    timesPerPeriod: 3,
    createdOn: addDays(todayOf(user), -14),
  });

  const weekDots = page
    .getByRole("list", { name: "今週の習慣" })
    .getByRole("img");
  await page.goto("/record/week");
  await expect(weekDots.first()).toHaveText("月");
  // キャラの吹き出し（下に「土曜 ・ 今週の残り 1日」のような添え書きが付く）
  const speechMeta = page.getByText(/今週の残り/);
  await expect(speechMeta).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("combobox", { name: "週の始まり" }).selectOption({
    label: "日曜日",
  });
  await expect
    .poll(async () => (await settingsOf(user.id))?.weekStart)
    .toBe("sun");

  const grumbleSwitch = page.getByRole("switch", { name: "ぼやきを表示" });
  await expect(grumbleSwitch).toBeChecked();
  await grumbleSwitch.click();
  await expect(grumbleSwitch).not.toBeChecked();
  await expect
    .poll(async () => (await settingsOf(user.id))?.grumbleEnabled)
    .toBe(false);

  await page.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/record\/today$/);
  await page.getByRole("link", { name: /^今週/ }).click();
  await expect(page).toHaveURL(/\/record\/week$/);
  await expect(weekDots.first()).toHaveText("日");
  await expect(speechMeta).toBeHidden();
});
