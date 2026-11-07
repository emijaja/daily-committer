/**
 * 統合テスト（実際の Postgres に対して service・repository を動かす）の設定。
 * `pnpm test:integration` で実行する。対象は `*.int.test.ts`。
 * 接続先の決め方は src/server/testing/test-database-url.ts を参照。
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) =>
  fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src(""),
      // "server-only" は React Server の環境の外で読み込むと例外を投げるので、空のモジュールに差し替える
      "server-only": src("server/testing/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    environment: "node",
    globalSetup: ["src/server/testing/global-setup.ts"],
    setupFiles: ["src/server/testing/setup.ts"],
    // 1つの DB を共有し、テストごとに片付けるので、ファイルを並列に実行しない
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
