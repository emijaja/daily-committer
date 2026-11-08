import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // 統合テスト（実際の Postgres を使う）は pnpm test:integration で別に実行する
    exclude: ["**/node_modules/**", "src/**/*.int.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**"],
      exclude: ["src/domain/**/*.test.ts", "src/domain/fixtures/**"],
    },
  },
});
