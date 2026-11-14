/**
 * E2E の前に1回だけ動く。E2E 用の DB がなければ作り、マイグレーションを当てる。
 * webServer はこれより先に起動するが、起動の確認に使う URL（O1）は DB を読まない。
 */
import {
  ensureDatabase,
  migrateDatabase,
} from "../../src/server/testing/global-setup";
import { e2eDatabaseUrl } from "./support/env";

export default async function globalSetup(): Promise<void> {
  const url = e2eDatabaseUrl();
  if (!process.env.CI) await ensureDatabase(url);
  await migrateDatabase(url);
}
