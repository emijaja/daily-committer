/**
 * ドメインの型。仕様は docs/web/domain-spec.md。
 * domain 層は I/O を持たない純粋関数だけで構成する（docs/web/architecture.md 1章）。
 */

/** ユーザーの「1日」で決まる日付。'YYYY-MM-DD'。JavaScript の Date は使わない。 */
export type LogicalDate = string & { readonly __brand: "LogicalDate" };

export type Period = "daily" | "weekly" | "monthly";
export type RecordType = "check" | "quantity";
/** 量の入力のしかた：合計を入力／回ごとに足す */
export type InputMode = "total" | "increment";
export type WeekStart = "mon" | "sun";
export type Expression = "normal" | "grumpy" | "happy" | "sleepy";

export interface Habit {
  id: string;
  name: string;
  note: string | null;
  period: Period;
  recordType: RecordType;
  /** 週次・月次のチェックのみの習慣の回数の目標（この場合は必須）。日次と量の習慣では null */
  timesPerPeriod: number | null;
  /** 量の単位。チェックのみでは null */
  unit: string | null;
  /** 量の目標（その周期の1期間あたり）。null なら目標なし */
  quantityTarget: number | null;
  /** 量の入力のしかた。チェックのみでは null */
  inputMode: InputMode | null;
  /** 習慣を作った日 */
  createdOn: LogicalDate;
  /** 過去の習慣にした日。null なら現在の習慣 */
  archivedOn: LogicalDate | null;
  sortOrder: number;
}

export interface Entry {
  id: string;
  habitId: string;
  date: LogicalDate;
  /** チェックのみの習慣では null */
  quantity: number | null;
}

export interface Settings {
  /** IANA タイムゾーン。例 'Asia/Tokyo' */
  timezone: string;
  weekStart: WeekStart;
  /** 日付が切り替わる時刻（0〜6）。既定 4 */
  dayStartHour: number;
  grumbleEnabled: boolean;
  grumblePush: boolean;
  /** 'HH:MM'。null ならリマインドしない */
  reminderTime: string | null;
}

/** 期間（両端を含む） */
export interface DateRange {
  start: LogicalDate;
  end: LogicalDate;
}

/** 文章の一部を強調表示するための断片（振り返り・セリフ） */
export interface TextSegment {
  text: string;
  emphasis?: boolean;
}
