import type { Db } from "@/db/client";

/** トランザクションの中で使う接続 */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** repository の関数が受け取る接続。db そのものか、トランザクション */
export type Executor = Db | Tx;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuid の形でない ID を DB に渡すと型のエラーになるので、先に弾くために使う */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
