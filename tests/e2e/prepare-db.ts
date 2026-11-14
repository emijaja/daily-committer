/**
 * E2E 用の DB がなければ作り、マイグレーションを当てる（playwright.config.ts の webServer から実行する）。
 * Playwright の globalSetup は webServer の起動より後に動くので、サーバーの起動前に済ませるためにここで行う。
 */
import { prepareDatabase } from "../../src/server/testing/global-setup";
import { e2eDatabaseUrl } from "./support/env";

// tsx は package.json に "type": "module" がないと CommonJS として動かすので、トップレベルの await は使わない
prepareDatabase(e2eDatabaseUrl()).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
