import "server-only";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * 必須の環境変数を読む。なければ変数名つきで例外を投げる。
 * ただし `next build` 中は値がなくても止めない（ビルドでは DB や OAuth を使わないため。
 * CI などで秘密の値なしにビルドできるようにする）。
 */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return "";
  throw new Error(
    `環境変数 ${name} が設定されていません（.env.example を参照）`,
  );
}
