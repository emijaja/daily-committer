/**
 * E2E テスト（Playwright）の設定。`pnpm test:e2e` で実行する。対象は tests/e2e/。
 * 本番ビルドのサーバー（next start）をポート 3314 で起動し、モバイル幅の Chromium で動かす。
 * サーバーの起動前に E2E 用の DB を用意する（tests/e2e/prepare-db.ts）。
 * - ローカル：起動の前に next build する。3314 にすでにサーバーがあればエラーにする
 *   （古いビルドや別の DB のサーバーを黙って使わないため。止めてから実行する）
 * - CI：前の手順の pnpm build の結果をそのまま使う
 * 接続先の DB は tests/e2e/support/env.ts を参照。
 */
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, E2E_PORT, e2eDatabaseUrl } from "./tests/e2e/support/env";

// ローカルでは .env.local の値（BETTER_AUTH_SECRET・DATABASE_URL など）を使う。
// すでに環境変数にある値は上書きしない
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI では環境変数で渡すのでファイルはない
}

const isCi = Boolean(process.env.CI);
// テストの補助関数（別のプロセス）も同じ DB を使うよう、決めた値を環境変数に入れておく
process.env.E2E_DATABASE_URL = e2eDatabaseUrl();

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    // デザインの幅（375）のスマホ。ブラウザは Chromium だけ
    ...devices["Desktop Chrome"],
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chromium" }],
  webServer: {
    command: [
      "pnpm exec tsx tests/e2e/prepare-db.ts",
      ...(isCi ? [] : ["pnpm build"]),
      `pnpm start --port ${E2E_PORT}`,
    ].join(" && "),
    url: `${BASE_URL}/onboarding`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
    },
  },
});
