/**
 * 統合テストの接続先。テストは毎回データを消すので、開発用の DB を壊さないようにする。
 *
 * 1. TEST_DATABASE_URL があればそれを使う
 * 2. CI（環境変数 CI がある）では DATABASE_URL を使う（マイグレーション済みの使い捨ての DB）。
 *    どちらも無ければエラーにする
 * 3. それ以外（ローカル）は docker の同じコンテナの別の DB `confidently_test` を使う
 *
 * CI 以外で DB 名が `_test` で終わらない接続先は、誤って開発用の DB を消さないよう拒否する。
 */
const LOCAL_DEFAULT =
  "postgres://confidently:confidently@localhost:5432/confidently_test";

export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  const isCi = Boolean(process.env.CI);
  if (isCi && !explicit && !process.env.DATABASE_URL) {
    // CI でローカルの接続先に黙って切り替えると、設定ミスが分かりにくい接続エラーになる
    throw new Error(
      "CI では統合テストの接続先として TEST_DATABASE_URL か DATABASE_URL を設定してください",
    );
  }
  const url =
    explicit || (isCi ? process.env.DATABASE_URL : undefined) || LOCAL_DEFAULT;
  if (!isCi && !databaseName(url).endsWith("_test")) {
    throw new Error(
      `統合テストの接続先の DB 名は _test で終わる必要があります（${databaseName(url)}）。TEST_DATABASE_URL を確認してください`,
    );
  }
  return url;
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}
