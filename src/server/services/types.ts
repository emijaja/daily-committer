/**
 * server 層と画面（app）の間の契約。画面はこの型を受け取って表示する。
 * 実装はレーン C（docs/web/implementation-plan.md）。
 */
import type { PeriodProgress, CompletionSummary } from "@/domain/achievement";
import type { GrassCell } from "@/domain/grass";
import type { Grumble } from "@/domain/grumble";
import type { ReviewItem } from "@/domain/review";
import type {
  DateRange,
  Entry,
  Habit,
  InputMode,
  LogicalDate,
  Period,
  RecordType,
  Settings,
} from "@/domain/types";

export type UserId = string;

/** Server Actions の戻り値。失敗は例外ではなくこの形で返す */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

// ── ① 記録 ─────────────────────────────

export interface RecordRow {
  habit: Habit;
  progress: PeriodProgress;
  /**
   * その期間（progress.range）の、この習慣の記録（日付の古い順）。
   * ① の楽観的更新での再計算と、⑧-b の記録の一覧に使う。getRecordView は必ず入れる
   */
  entries?: Entry[];
  /**
   * 連続記録（domain/streak.ts の currentStreak。周期の数）。
   * endedLastPeriod は「いまの連続が 0 で、前の期間（昨日・先週・先月）の前まで続いていた」
   * （①-a の「昨日で途切れました」）。getRecordView は必ず入れる
   */
  streak?: { current: number; endedLastPeriod: boolean };
}

export interface RecordView {
  period: Period;
  today: LogicalDate;
  range: DateRange;
  rows: RecordRow[];
  summary: CompletionSummary;
  /** 上部タブの「今日 2/3」「今週 1/2」「今月 1/3」 */
  tabSummaries: Record<Period, CompletionSummary>;
  /** ぼやきを表示しない設定、または習慣が0件なら null */
  grumble: Grumble | null;
  /** 集計カードのタグ（例：STREAK 6・読書 6日連続）。なければ null */
  highlight: { tag: string; label: string } | null;
}

// ── ④⑤ 習慣 ────────────────────────────

export interface HabitInput {
  name: string;
  note: string | null;
  period: Period;
  recordType: RecordType;
  timesPerPeriod: number | null;
  unit: string | null;
  quantityTarget: number | null;
  inputMode: InputMode | null;
}

export interface HabitListView {
  status: "active" | "archived";
  counts: { active: number; archived: number };
  groups: { period: Period; habits: Habit[] }[];
}

// ── ⑥② 振り返り・記録の確認 ──────────────

export interface ReviewView {
  year: number;
  /** null なら「すべての習慣」、指定すると「習慣ごと」 */
  habitId: string | null;
  grass: GrassCell[];
  recordCount: number;
  achievements: ReviewItem[];
  almostThere: ReviewItem[];
  grumble: Grumble | null;
  /** いちばん古い記録の日（E4 の判定。記録がなければ null） */
  firstRecordDate: LogicalDate | null;
}

export interface DayEditView {
  date: LogicalDate;
  daily: RecordRow[];
  weekly: { range: DateRange; rows: RecordRow[] };
  monthly: { range: DateRange; rows: RecordRow[] };
  /** 習慣を始める前の日なら true（E4） */
  beforeStart: boolean;
}

// ── ③ 習慣の詳細 ───────────────────────

export interface HabitDetailView {
  habit: Habit;
  currentStreak: number;
  longestStreak: number;
  isPersonalBest: boolean;
  grass: GrassCell[];
  /** 今月の達成日数など、数字の箱4つ */
  stats: { label: string; value: string; unit?: string }[];
  grumble: Grumble | null;
}

export type { Settings };
