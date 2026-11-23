/**
 * server 層と画面（app）の間の契約。画面はこの型を受け取って表示する。
 * 実装はレーン C（docs/web/implementation-plan.md）。
 */
import type { PeriodProgress, CompletionSummary } from "@/domain/achievement";
import type { GrassCell } from "@/domain/grass";
import type { MemoCategory, MemoSpeech, TargetStats } from "@/domain/memo";
import type { Grumble } from "@/domain/grumble";
import type { StreakUnit } from "@/domain/habit-detail";
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
  WeekStart,
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
  /**
   * 記録する日（① は今日、② は選んだ日）の、この習慣へのひとこと。なければ null。
   * getRecordView・getDayEditView は必ず入れる
   */
  note?: string | null;
  /**
   * 量のシートの「前回」チップの量（domain/note.ts の previousQuantity）。
   * 量の習慣でない・前回がないなら null。getRecordView・getDayEditView は必ず入れる
   */
  previousQuantity?: number | null;
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
  /** サーバーで決めた今日（草の未来のマス・年の切り替えの上限） */
  today: LogicalDate;
  weekStart: WeekStart;
  /**
   * 「習慣ごと」で選べる習慣：その年に1日でも現在の習慣だったもの。
   * 現在の習慣を並び順に、そのあと過去の習慣を並び順に
   */
  habits: Habit[];
  grass: GrassCell[];
  recordCount: number;
  achievements: ReviewItem[];
  almostThere: ReviewItem[];
  grumble: Grumble | null;
  /** いちばん古い記録の日（E4 の判定。記録がなければ null） */
  firstRecordDate: LogicalDate | null;
}

/**
 * ② の表示用データ。行はその日に「現在の習慣」だったもの（isActiveOn）を並び順に。
 * 各行の entries はその行の期間（progress.range）の記録。streak は入れない
 */
export interface DayEditView {
  date: LogicalDate;
  daily: RecordRow[];
  weekly: { range: DateRange; rows: RecordRow[] };
  monthly: { range: DateRange; rows: RecordRow[] };
  /** 習慣を始める前の日なら true（E4）。date < startDate、または習慣が1つもない */
  beforeStart: boolean;
  /** サーバーで決めた今日（日付ナビの上限） */
  today: LogicalDate;
  weekStart: WeekStart;
  /** 習慣を始めた日：過去の習慣も含め、いちばん古い作った日。習慣がなければ null */
  startDate: LogicalDate | null;
  /** いちばん古い記録の日（E4 の文と「最初の記録の日へ」。記録がなければ null） */
  firstRecordDate: LogicalDate | null;
  /**
   * 日付を選ぶカレンダー（⑥-b と同じ）の草。すべての習慣の4段階。
   * startDate と date のうち前のほうを含む月の1日から、今日まで
   */
  calendar: { range: DateRange; grass: GrassCell[] };
}

// ── ③ 習慣の詳細 ───────────────────────

export interface HabitDetailView {
  habit: Habit;
  /** サーバーで決めた今日（草の未来のマス） */
  today: LogicalDate;
  weekStart: WeekStart;
  /** 連続の単位（日次は日、週次は週、月次はか月） */
  streakUnit: StreakUnit;
  currentStreak: number;
  longestStreak: number;
  isPersonalBest: boolean;
  /** 直近1年（365日）の2値の草。過去の習慣は過去にした日の前の日まで */
  grass: GrassCell[];
  /** 今月の達成日数など、数字の箱4つ */
  stats: { label: string; value: string; unit?: string }[];
  grumble: Grumble | null;
}

// ── ⑨ メモ ─────────────────────────────

/** 一覧・過去のメモのカードに出す1件 */
export interface MemoItem {
  id: string;
  date: LogicalDate;
  body: string;
  categoryId: string | null;
  /** タグに出す名前：カテゴリ名、習慣へのひとことなら習慣名。どちらもなければ null */
  tag: string | null;
  /** 習慣へのひとことなら true（編集画面ではカテゴリを選べない） */
  isHabitNote: boolean;
  /** 一覧の時刻（例 21:04）。ユーザーのタイムゾーンで、書いた時刻 */
  time: string;
}

/** ⑨ の「1年前の今日の自分」・⑨-d の「ふと、あの日の自分」 */
export interface PastMemoCard {
  heading: string;
  memo: MemoItem;
}

/** 書く画面のカレンダーの、日ごとの状態（目標を達成・書いた・なし） */
export type MemoDayStatus = "achieved" | "written" | "none";

/** ⑨ メモ：書く の表示用データ */
export interface MemoHomeView {
  today: LogicalDate;
  /** 吹き出しの下の時刻（例 21:04） */
  clock: string;
  categories: MemoCategory[];
  speech: MemoSpeech;
  /** 「別のメモ」で順に出す過去のメモ（なければ空） */
  pastMemos: PastMemoCard[];
  /** 今日の、カテゴリごとの件数（カテゴリの ID → 件数） */
  todayCounts: Record<string, number>;
  /** 今日書いたメモの件数（すべて。習慣へのひとことも含む） */
  todayTotal: number;
  /** 1日の目標があるカテゴリの達成（並び順） */
  targets: TargetStats[];
  /** 書きかけのメモがあれば、そのカテゴリ名と日付 */
  draft: { date: LogicalDate; categoryName: string | null } | null;
}

/** ⑨-b 書く・メモの編集 の表示用データ */
export interface MemoWriteView {
  today: LogicalDate;
  weekStart: WeekStart;
  categories: MemoCategory[];
  /** 新しく書くときは null。編集のときはそのメモ */
  memo: MemoItem | null;
  /** 初めに入れておく日付・カテゴリ・本文（編集のメモ、または下書き、または指定・お題の値） */
  initial: { date: LogicalDate; categoryId: string | null; body: string };
  /** 下書きから続きを書いているなら true（送ったら下書きを消す） */
  fromDraft: boolean;
  /** 新しく書く画面で、ほかに書きかけのメモがあれば（「下書き」の入り口） */
  draft: { date: LogicalDate; categoryName: string | null } | null;
  /** 日付を選ぶカレンダー：12か月前の月の1日から今日までの、日ごとの状態 */
  calendar: { date: LogicalDate; status: MemoDayStatus }[];
}

/** ⑨-d すべてのメモ の表示用データ */
export interface MemoListView {
  today: LogicalDate;
  year: number;
  /** 1〜12 */
  month: number;
  /** 絞り込みのカテゴリ。null なら「すべて」 */
  categoryId: string | null;
  categories: MemoCategory[];
  /** その月の件数 */
  count: number;
  /** 日ごと（新しい日から）。同じ日は書いた順の新しい順 */
  days: { date: LogicalDate; memos: MemoItem[] }[];
  pastMemos: PastMemoCard[];
  /** 前の月・次の月に移れるか（次は今月まで） */
  canPrev: boolean;
  canNext: boolean;
}

export type { Settings };
