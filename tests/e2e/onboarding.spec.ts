/**
 * オンボーディング（implementation-plan.md 3-4、screens.md「オンボーディング」）
 * - 未ログインで / を開くと O1
 * - 未完了のユーザー：O5 で習慣を選んで決定 → O4 → ①-a に選んだ習慣が出る
 * - O5 で0件のまま進めると、①-a は E1（習慣がまだない）
 */
import { expect, test } from "./fixtures";
import { habitsOf, settingsOf } from "./support/db";

test("未ログインで / を開くと O1 が出る", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Hello," })).toBeVisible();
  await expect(page.getByRole("link", { name: "はじめる" })).toBeVisible();
});

test("O5 で選んだ習慣が、O4 のあと ①-a に出る", async ({
  page,
  signedInUser,
  timezoneId,
}) => {
  const user = await signedInUser({ onboarded: false });

  // 入口から O5 へ
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding\/start$/);
  await expect(page.getByRole("heading", { name: "Start." })).toBeVisible();

  const presets = page.getByRole("group", { name: "おすすめの習慣" });
  await presets.getByRole("button", { name: "読書" }).click();
  await presets.getByRole("button", { name: "ストレッチ" }).click();
  await page.getByRole("button", { name: "この2つで決定" }).click();

  // O4
  await expect(page).toHaveURL(/\/onboarding\/grumble$/);
  await expect(page.getByRole("heading", { name: "Grumble." })).toBeVisible();
  await page.getByRole("button", { name: "あとで設定して、はじめる" }).click();

  // ①-a に選んだ習慣が出る
  await expect(page).toHaveURL(/\/record\/today$/);
  const list = page.getByRole("list", { name: "今日の習慣" });
  await expect(list.getByRole("checkbox", { name: "読書" })).toBeVisible();
  await expect(
    list.getByRole("checkbox", { name: "ストレッチ" }),
  ).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  const settings = await settingsOf(user.id);
  expect(settings?.onboardedAt).not.toBeNull();
  // O5 でブラウザのタイムゾーンが保存される
  expect(settings?.timezone).toBe(timezoneId);
  expect((await habitsOf(user.id)).map((h) => h.name)).toEqual([
    "読書",
    "ストレッチ",
  ]);

  // 終えたあとは入口から ①-a へ
  await page.goto("/");
  await expect(page).toHaveURL(/\/record\/today$/);
});

test("O5 で何も選ばずに進めると、①-a は E1 になる", async ({
  page,
  signedInUser,
}) => {
  const user = await signedInUser({ onboarded: false });

  await page.goto("/onboarding/start");
  await expect(page.getByText("選択中 0")).toBeVisible();
  await page.getByRole("button", { name: "選ばずにはじめる" }).click();

  await expect(page).toHaveURL(/\/onboarding\/grumble$/);
  await page.getByRole("button", { name: "あとで設定して、はじめる" }).click();

  await expect(page).toHaveURL(/\/record\/today$/);
  await expect(page.getByText("まだ習慣がありません")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /習慣を追加する/ }),
  ).toBeVisible();
  expect(await habitsOf(user.id)).toEqual([]);
});
