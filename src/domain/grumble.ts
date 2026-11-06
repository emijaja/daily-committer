import type { PeriodProgress } from "./achievement";
import { notImplemented } from "./not-implemented";
import type { Expression, LogicalDate, Period } from "./types";

/** キャラのぼやき。domain-spec.md 8章 */
export interface Grumble {
  expression: Expression;
  text: string;
}

export interface GrumbleInput {
  /** 記録画面のタブ */
  period: Period;
  progresses: readonly PeriodProgress[];
  /** 0〜23。ユーザーのタイムゾーンでの現在の時 */
  hour: number;
  /** 日替わりでセリフを選ぶための種 */
  today: LogicalDate;
  /** 習慣名の引き当て（セリフへの差し込み用） */
  habitNames: Readonly<Record<string, string>>;
}

/** その期間の習慣が0件なら null（空の状態 E1／E2 を出す） */
export function selectGrumble(input: GrumbleInput): Grumble | null {
  return notImplemented(`selectGrumble(${input.period})`);
}
