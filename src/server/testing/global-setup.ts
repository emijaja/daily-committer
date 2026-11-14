/**
 * 統合テストの前に1回だけ動く。テスト用の DB がなければ作り、マイグレーションを当てる。
 * マイグレーションは適用済みなら何もしないので、CI（適用済みの DB）でもそのまま動く。
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { databaseName, testDatabaseUrl } from "./test-database-url";

/** DB がなければ作る（同じサーバーの postgres DB に接続して作る） */
export async function ensureDatabase(url: string): Promise<void> {
  const name = databaseName(url);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const found = await client.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    if (found.rowCount === 0) {
      await client.query(`create database "${name.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }
}

/** マイグレーションを当てる（適用済みなら何もしない） */
export async function migrateDatabase(url: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}

/**
 * テスト用の DB を使える状態にする（統合テスト・E2E で共通）。
 * CI では DB はすでにある（作る権限もない）ので、マイグレーションだけ当てる。
 */
export async function prepareDatabase(url: string): Promise<void> {
  if (!process.env.CI) await ensureDatabase(url);
  await migrateDatabase(url);
}

export default async function setup(): Promise<void> {
  await prepareDatabase(testDatabaseUrl());
}
