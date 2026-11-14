/**
 * E2E の接続先と設定。テストはユーザーを作って消すので、開発用の DB を壊さないよう専用の DB を使う。
 *
 * 1. E2E_DATABASE_URL があればそれを使う
 * 2. CI（環境変数 CI がある）では DATABASE_URL を使う（マイグレーション済みの使い捨ての DB）
 * 3. それ以外（ローカル）は DATABASE_URL の DB 名に `_e2e` を付けた DB（例：confidently_e2e）
 *
 * CI 以外で DB 名が `_e2e` で終わらない接続先は、誤って開発用の DB を使わないよう拒否する。
 */
import { databaseName } from "../../../src/server/testing/test-database-url";

export const E2E_PORT = 3314;
export const BASE_URL = `http://localhost:${E2E_PORT}`;

export function e2eDatabaseUrl(): string {
  const explicit = process.env.E2E_DATABASE_URL;
  const isCi = Boolean(process.env.CI);
  const base = explicit || process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "E2E の接続先として E2E_DATABASE_URL か DATABASE_URL（.env.local）を設定してください",
    );
  }
  let url = base;
  if (!explicit && !isCi) {
    const derived = new URL(base);
    derived.pathname = `/${databaseName(base)}_e2e`;
    url = derived.toString();
  }
  if (!isCi && !databaseName(url).endsWith("_e2e")) {
    throw new Error(
      `E2E の接続先の DB 名は _e2e で終わる必要があります（${databaseName(url)}）。E2E_DATABASE_URL を確認してください`,
    );
  }
  return url;
}

/** Better Auth の cookie の署名に使う秘密の値（アプリのサーバーと同じ値） */
export function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET を設定してください");
  return secret;
}
