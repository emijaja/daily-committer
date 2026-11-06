import { notImplemented } from "@/domain/not-implemented";
import type { LogicalDate, Period } from "@/domain/types";
import type { RecordView, UserId } from "./types";

/** ①-a/b/c の表示用データ。now はテスト用に差し替えられる */
export async function getRecordView(
  userId: UserId,
  period: Period,
  now: Date = new Date(),
): Promise<RecordView> {
  return notImplemented(
    `getRecordView(${userId}, ${period}, ${now.toISOString()})`,
  );
}

/** チェックのみの習慣の記録を付ける／外す。付けたら true */
export async function toggleCheck(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
): Promise<boolean> {
  return notImplemented(`toggleCheck(${userId}, ${habitId}, ${date})`);
}

/** 「合計を入力」の習慣の、その日の合計を上書きする。0 なら記録を削除 */
export async function setQuantityTotal(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
  quantity: number,
): Promise<void> {
  return notImplemented(
    `setQuantityTotal(${userId}, ${habitId}, ${date}, ${quantity})`,
  );
}

/** 「回ごとに足す」の習慣に1回分を追加する。追加した記録の ID を返す */
export async function addQuantity(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
  quantity: number,
): Promise<string> {
  return notImplemented(
    `addQuantity(${userId}, ${habitId}, ${date}, ${quantity})`,
  );
}

/** ＋の長押し：前回と同じ量で記録する。取り消し用に記録の ID を返す */
export async function repeatLastQuantity(
  userId: UserId,
  habitId: string,
  date: LogicalDate,
): Promise<{ entryId: string; quantity: number }> {
  return notImplemented(`repeatLastQuantity(${userId}, ${habitId}, ${date})`);
}

/** 記録を1件削除する（取り消し、⑧-b の明細の削除） */
export async function deleteEntry(
  userId: UserId,
  entryId: string,
): Promise<void> {
  return notImplemented(`deleteEntry(${userId}, ${entryId})`);
}
