/**
 * 記録画面の楽観的更新（architecture.md 3章）。
 * 記録（entries）を書き換え、進み具合と集計は domain で計算し直す。
 * サーバーの処理が終わると、revalidatePath で届いた本当のデータに置き換わる。
 */
import { evaluatePeriod, summarize } from "@/domain/achievement";
import type { Entry, LogicalDate } from "@/domain/types";
import type { RecordRow, RecordView } from "@/server/services/types";

/** 習慣 ID → その期間の記録 */
export type EntriesByHabit = Readonly<Record<string, readonly Entry[]>>;

export type RecordOp =
  /** チェックのみの習慣の、その日の記録を付ける／外す */
  | { type: "toggle"; habitId: string; date: LogicalDate }
  /** 合計を入力：その日の合計を上書き（0 なら削除） */
  | { type: "setTotal"; habitId: string; date: LogicalDate; quantity: number }
  /** 回ごとに足す：1回分を追加 */
  | { type: "add"; habitId: string; date: LogicalDate; quantity: number }
  /** 記録を1件削除 */
  | { type: "delete"; entryId: string };

/** 楽観的に足した記録の仮の ID（サーバーの ID が届くまで。削除などには使えない） */
export const TEMP_ID_PREFIX = "optimistic-";
export const isTempId = (id: string) => id.startsWith(TEMP_ID_PREFIX);

let seq = 0;
const tempEntry = (
  habitId: string,
  date: LogicalDate,
  quantity: number | null,
): Entry => ({
  id: `${TEMP_ID_PREFIX}${++seq}`,
  habitId,
  date,
  quantity,
});

export function entriesByHabit(rows: readonly RecordRow[]): EntriesByHabit {
  return Object.fromEntries(rows.map((r) => [r.habit.id, r.entries ?? []]));
}

export function applyRecordOp(
  state: EntriesByHabit,
  op: RecordOp,
): EntriesByHabit {
  if (op.type === "delete") {
    return Object.fromEntries(
      Object.entries(state).map(([id, list]) => [
        id,
        list.filter((e) => e.id !== op.entryId),
      ]),
    );
  }
  const list = state[op.habitId] ?? [];
  let next: readonly Entry[];
  switch (op.type) {
    case "toggle":
      next = list.some((e) => e.date === op.date)
        ? list.filter((e) => e.date !== op.date)
        : [...list, tempEntry(op.habitId, op.date, null)];
      break;
    case "setTotal": {
      const others = list.filter((e) => e.date !== op.date);
      next =
        op.quantity > 0
          ? [...others, tempEntry(op.habitId, op.date, op.quantity)]
          : others;
      break;
    }
    case "add":
      next = [...list, tempEntry(op.habitId, op.date, op.quantity)];
      break;
  }
  return { ...state, [op.habitId]: sortByDate(next) };
}

/** 日付の古い順（同じ日は元の順）。sort は安定ソート */
function sortByDate(list: readonly Entry[]): Entry[] {
  return [...list].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

/** 書き換えた記録から、行の進み具合とタブの集計を計算し直す */
export function recompute(
  view: RecordView,
  state: EntriesByHabit,
): Pick<RecordView, "rows" | "summary" | "tabSummaries"> {
  const rows = view.rows.map((row): RecordRow => {
    const entries = [...(state[row.habit.id] ?? [])];
    const progress = evaluatePeriod(row.habit, entries, row.progress.range);
    return { ...row, entries, progress, streak: adjustStreak(row, progress) };
  });
  const summary = summarize(rows.map((r) => r.progress));
  return {
    rows,
    summary,
    tabSummaries: { ...view.tabSummaries, [view.period]: summary },
  };
}

/**
 * 進行中の期間の達成が変わったときの、いまの連続。
 * 書き換えるのは表示中の期間（進行中の期間）の記録だけなので、
 * それより前の期間の連続は変わらず、進行中の期間の分（0 か 1）だけが増減する。
 */
function adjustStreak(
  row: RecordRow,
  progress: RecordRow["progress"],
): RecordRow["streak"] {
  const { streak } = row;
  if (!streak || progress.achieved === row.progress.achieved) return streak;
  const current = streak.current + (progress.achieved ? 1 : -1);
  return {
    current,
    endedLastPeriod: current > 0 ? false : streak.endedLastPeriod,
  };
}
