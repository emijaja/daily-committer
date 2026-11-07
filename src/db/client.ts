import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requiredEnv } from "@/lib/server-env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  // Pool を作るだけでは接続しないので、ビルド中に値が空でも問題ない
  return new Pool({ connectionString: requiredEnv("DATABASE_URL"), max: 5 });
}

// 開発中のホットリロードで接続が増え続けないよう、プールを使い回す
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
