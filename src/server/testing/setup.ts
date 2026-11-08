/**
 * 統合テストの各ファイルの前に動く。
 * - src/db/client.ts が読む DATABASE_URL をテスト用の DB に向ける（client.ts を読み込む前に設定する）
 * - テストごとにすべてのデータを消す
 */
import { afterAll, beforeEach } from "vitest";
import { testDatabaseUrl } from "./test-database-url";

process.env.DATABASE_URL = testDatabaseUrl();

beforeEach(async () => {
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  // user を消すと、外部キーの CASCADE で設定・習慣・記録・セッションもすべて消える
  await db.execute(sql`truncate table "user", "verification" cascade`);
});

afterAll(async () => {
  const pool = (globalThis as { pgPool?: { end(): Promise<void> } }).pgPool;
  await pool?.end();
  delete (globalThis as { pgPool?: unknown }).pgPool;
});
