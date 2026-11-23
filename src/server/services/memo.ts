/**
 * ぼやき・メモ（⑨）のユースケース。docs/web/domain-spec.md 2章 memos・memo_categories・memo_drafts。
 *
 * - メモ・カテゴリ・下書きは必ず userId で絞る（他人の ID を指定されても見つからない扱いにする）
 * - メモの日付は「今日」まで。未来の日には書けない（今日はサーバーで決める）
 * - はじめてメモの画面を開いたとき（カテゴリもメモもないとき）に、既定のカテゴリを作る
 */
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { addDays, makeLogicalDate, splitDate } from "@/domain/date";
import {
  countByDate,
  DEFAULT_MEMO_CATEGORIES,
  memoSpeech,
  normalizeMemoBody,
  PAST_MEMO_HEADING,
  pastMemoCandidates,
  targetStats,
  type MemoCategory,
} from "@/domain/memo";
import type { LogicalDate } from "@/domain/types";
import * as categoriesRepo from "@/server/repositories/memo-categories";
import * as draftsRepo from "@/server/repositories/memo-drafts";
import * as memosRepo from "@/server/repositories/memos";
import type { MemoRecord } from "@/server/repositories/memos";
import type { Executor } from "@/server/repositories/types";
import { memoCategoryInputSchema, memoBodySchema } from "@/server/validation";
import { hourIn, todayFor } from "./clock";
import { ServiceError } from "./errors";
import { getSettings } from "./settings";
import type {
  MemoDayStatus,
  MemoHomeView,
  MemoItem,
  MemoListView,
  MemoWriteView,
  PastMemoCard,
  UserId,
} from "./types";

export const memoNotFound = () =>
  new ServiceError("not_found", "メモが見つかりません");

export const categoryNotFound = () =>
  new ServiceError("not_found", "カテゴリが見つかりません");

/** 過去のメモのカードの候補の数（「別のメモ」で順に出す） */
const PAST_MEMO_LIMIT = 10;

/** カレンダーで遡れる月数（書く画面の日付） */
const CALENDAR_MONTHS = 12;

// ── 読み取り ─────────────────────────────

/**
 * カテゴリ。カテゴリもメモも1件もなければ（はじめてメモの画面を開いたとき）既定のカテゴリを作る。
 * 同時に開いても2回作らないよう、ユーザーごとのロックをかける
 */
export async function ensureCategories(
  userId: UserId,
): Promise<MemoCategory[]> {
  const existing = await categoriesRepo.listCategories(db, userId);
  if (existing.length > 0) return existing;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const again = await categoriesRepo.listCategories(tx, userId);
    if (again.length > 0) return again;
    const anyMemo = await memosRepo.listMemos(tx, userId, {
      excludeHabitNotes: true,
    });
    // カテゴリをすべて消した人には作り直さない（カテゴリなしのメモが残っている）
    if (anyMemo.length > 0) return [];
    return categoriesRepo.insertCategories(tx, userId, DEFAULT_MEMO_CATEGORIES);
  });
}

/** ⑨ メモ：書く。now はテスト用に差し替えられる */
export async function getMemoHomeView(
  userId: UserId,
  now: Date = new Date(),
): Promise<MemoHomeView> {
  const settings = await getSettings(userId);
  const today = todayFor(settings, now);
  const [categories, memos, draft] = await Promise.all([
    ensureCategories(userId),
    memosRepo.listMemos(db, userId),
    draftsRepo.findDraft(db, userId),
  ]);
  const todays = memos.filter((m) => m.date === today);
  const todayCounts = new Map<string, number>();
  for (const m of todays) {
    if (m.categoryId)
      todayCounts.set(m.categoryId, (todayCounts.get(m.categoryId) ?? 0) + 1);
  }
  const toItem = itemMaker(categories, settings.timezone);
  return {
    today,
    clock: clockOf(now, settings.timezone),
    categories,
    speech: memoSpeech({
      categories,
      todayCounts,
      todayTotal: todays.length,
      hour: hourIn(now, settings.timezone),
    }),
    pastMemos: pastCards(memos, today, toItem),
    todayCounts: Object.fromEntries(todayCounts),
    todayTotal: todays.length,
    targets: categories.flatMap((c) => {
      const stats = targetStats(c, memos, today);
      return stats ? [stats] : [];
    }),
    draft: draft ? draftSummary(draft, categories) : null,
  };
}

export interface WriteViewOptions {
  /** 編集するメモ */
  memoId?: string;
  /** 新しく書く日（省略なら今日） */
  date?: LogicalDate;
  /** 新しく書くカテゴリ（省略ならお題のカテゴリ） */
  categoryId?: string;
  /** 下書きから続きを書く */
  draft?: boolean;
}

/** ⑨-b 書く・メモの編集 */
export async function getMemoWriteView(
  userId: UserId,
  options: WriteViewOptions = {},
  now: Date = new Date(),
): Promise<MemoWriteView> {
  const settings = await getSettings(userId);
  const today = todayFor(settings, now);
  const calendarFrom = monthStart(addMonths(today, -CALENDAR_MONTHS));
  const [categories, draft, recent] = await Promise.all([
    ensureCategories(userId),
    draftsRepo.findDraft(db, userId),
    memosRepo.listMemos(db, userId, { from: calendarFrom, to: today }),
  ]);
  const toItem = itemMaker(categories, settings.timezone);
  const base = {
    today,
    weekStart: settings.weekStart,
    categories,
    calendar: calendarOf(categories, recent, calendarFrom, today),
  };

  if (options.memoId) {
    const record = await memosRepo.findMemo(db, userId, options.memoId);
    if (!record) throw memoNotFound();
    const memo = toItem(record);
    return {
      ...base,
      memo,
      initial: {
        date: memo.date,
        categoryId: memo.categoryId,
        body: memo.body,
      },
      fromDraft: false,
      draft: null,
    };
  }

  const known = (id: string | null | undefined) =>
    id && categories.some((c) => c.id === id) ? id : null;

  if (options.draft && draft) {
    return {
      ...base,
      memo: null,
      initial: {
        date: draft.date > today ? today : draft.date,
        categoryId: known(draft.categoryId),
        body: draft.body,
      },
      fromDraft: true,
      draft: null,
    };
  }

  const date = options.date && options.date <= today ? options.date : today;
  const todayCounts = countByCategory(recent.filter((m) => m.date === today));
  const speech = memoSpeech({
    categories,
    todayCounts,
    todayTotal: 0,
    hour: hourIn(now, settings.timezone),
  });
  return {
    ...base,
    memo: null,
    initial: {
      date,
      categoryId:
        known(options.categoryId) ??
        speech.categoryId ??
        categories[0]?.id ??
        null,
      body: "",
    },
    fromDraft: false,
    draft: draft ? draftSummary(draft, categories) : null,
  };
}

/** ⑨-d すべてのメモ。month は 'YYYY-MM'（省略なら今月）。今月より先は今月にする */
export async function getMemoListView(
  userId: UserId,
  options: { month?: string; categoryId?: string } = {},
  now: Date = new Date(),
): Promise<MemoListView> {
  const settings = await getSettings(userId);
  const today = todayFor(settings, now);
  const [ty, tm] = splitDate(today);
  let [year, month] = parseMonth(options.month) ?? [ty, tm];
  if (year * 12 + month > ty * 12 + tm) [year, month] = [ty, tm];

  const categories = await ensureCategories(userId);
  const categoryId =
    options.categoryId && categories.some((c) => c.id === options.categoryId)
      ? options.categoryId
      : null;
  const from = makeLogicalDate(year, month, 1);
  const to = addDays(addMonths(from, 1), -1);
  const [monthMemos, all] = await Promise.all([
    memosRepo.listMemos(db, userId, {
      from,
      to,
      ...(categoryId ? { categoryId } : {}),
    }),
    memosRepo.listMemos(db, userId),
  ]);
  const toItem = itemMaker(categories, settings.timezone);
  const days: MemoListView["days"] = [];
  for (const record of monthMemos) {
    const last = days.at(-1);
    if (last?.date === record.date) last.memos.push(toItem(record));
    else days.push({ date: record.date, memos: [toItem(record)] });
  }
  const oldest = all.at(-1)?.date ?? today;
  return {
    today,
    year,
    month,
    categoryId,
    categories,
    count: monthMemos.length,
    days,
    pastMemos: pastCards(all, today, toItem),
    canPrev: from > monthStart(oldest),
    canNext: year * 12 + month < ty * 12 + tm,
  };
}

// ── 書き込み ─────────────────────────────

/** メモの日付：省略なら今日。未来の日は書けない */
async function resolveMemoDate(
  userId: UserId,
  date: LogicalDate | undefined,
  now: Date,
): Promise<LogicalDate> {
  const today = todayFor(await getSettings(userId), now);
  if (date === undefined) return today;
  if (date > today) {
    throw new ServiceError("invalid", "未来の日付には書けません");
  }
  return date;
}

async function requireCategory(
  exec: Executor,
  userId: UserId,
  categoryId: string | null,
): Promise<void> {
  if (categoryId === null) return;
  if (!(await categoriesRepo.findCategory(exec, userId, categoryId))) {
    throw categoryNotFound();
  }
}

export interface MemoInput {
  date?: LogicalDate;
  categoryId: string | null;
  body: string;
  /** 下書きから続きを書いたなら true（送ったら下書きを消す） */
  fromDraft?: boolean;
}

/** メモを足す。本文が空なら保存しない（invalid）。作ったメモの ID */
export async function createMemo(
  userId: UserId,
  input: MemoInput,
  now: Date = new Date(),
): Promise<string> {
  const body = normalizeMemoBody(memoBodySchema.parse(input.body));
  if (body === null) throw new ServiceError("invalid", "メモを書いてください");
  const date = await resolveMemoDate(userId, input.date, now);
  return db.transaction(async (tx) => {
    await requireCategory(tx, userId, input.categoryId);
    const id = await memosRepo.insertMemo(tx, userId, {
      date,
      body,
      categoryId: input.categoryId,
    });
    if (input.fromDraft) await draftsRepo.deleteDraft(tx, userId);
    return id;
  });
}

/**
 * メモを書き換える。本文を空にしたら消す（domain-spec.md 2章）。
 * 消したら null、書き換えたら ID
 */
export async function updateMemo(
  userId: UserId,
  memoId: string,
  input: Required<Pick<MemoInput, "date">> & Omit<MemoInput, "fromDraft">,
  now: Date = new Date(),
): Promise<string | null> {
  const body = normalizeMemoBody(memoBodySchema.parse(input.body));
  const date = await resolveMemoDate(userId, input.date, now);
  return db.transaction(async (tx) => {
    if (body === null) {
      if (!(await memosRepo.deleteMemo(tx, userId, memoId))) {
        throw memoNotFound();
      }
      return null;
    }
    await requireCategory(tx, userId, input.categoryId);
    const updated = await memosRepo.updateMemo(tx, userId, memoId, {
      date,
      body,
      categoryId: input.categoryId,
    });
    if (!updated) throw memoNotFound();
    return memoId;
  });
}

export async function deleteMemo(
  userId: UserId,
  memoId: string,
): Promise<void> {
  if (!(await memosRepo.deleteMemo(db, userId, memoId))) throw memoNotFound();
}

/** 下書きに保存する（前の下書きは上書き）。本文が空なら下書きを消す */
export async function saveDraft(
  userId: UserId,
  input: Omit<MemoInput, "fromDraft">,
  now: Date = new Date(),
): Promise<void> {
  const date = await resolveMemoDate(userId, input.date, now);
  const body = memoBodySchema.parse(input.body);
  await db.transaction(async (tx) => {
    if (body === "") {
      await draftsRepo.deleteDraft(tx, userId);
      return;
    }
    await requireCategory(tx, userId, input.categoryId);
    await draftsRepo.upsertDraft(tx, userId, {
      date,
      categoryId: input.categoryId,
      body,
    });
  });
}

export async function discardDraft(userId: UserId): Promise<void> {
  await draftsRepo.deleteDraft(db, userId);
}

export interface CategoryInput {
  name: string;
  prompt: string | null;
  dailyTarget: number | null;
}

/** カテゴリを並び順の最後に足す。作ったカテゴリ */
export async function createCategory(
  userId: UserId,
  input: CategoryInput,
): Promise<MemoCategory> {
  const values = memoCategoryInputSchema.parse(input);
  const [created] = await categoriesRepo.insertCategories(db, userId, [values]);
  return created!;
}

export async function updateCategory(
  userId: UserId,
  categoryId: string,
  input: CategoryInput,
): Promise<MemoCategory> {
  const values = memoCategoryInputSchema.parse(input);
  const updated = await categoriesRepo.updateCategory(
    db,
    userId,
    categoryId,
    values,
  );
  if (!updated) throw categoryNotFound();
  return updated;
}

/** カテゴリを消す。そのカテゴリのメモはカテゴリなしで残る */
export async function deleteCategory(
  userId: UserId,
  categoryId: string,
): Promise<void> {
  if (!(await categoriesRepo.deleteCategory(db, userId, categoryId))) {
    throw categoryNotFound();
  }
}

export async function getCategory(
  userId: UserId,
  categoryId: string,
): Promise<MemoCategory> {
  const category = await categoriesRepo.findCategory(db, userId, categoryId);
  if (!category) throw categoryNotFound();
  return category;
}

// ── 組み立て ─────────────────────────────

function clockOf(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

function itemMaker(categories: readonly MemoCategory[], timezone: string) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return (record: MemoRecord): MemoItem => ({
    id: record.id,
    date: record.date,
    body: record.body,
    categoryId: record.categoryId,
    tag:
      (record.categoryId ? names.get(record.categoryId) : undefined) ??
      record.habitName ??
      null,
    isHabitNote: record.habitId !== null,
    time: clockOf(record.createdAt, timezone),
  });
}

function pastCards(
  memos: readonly MemoRecord[],
  today: LogicalDate,
  toItem: (record: MemoRecord) => MemoItem,
): PastMemoCard[] {
  return pastMemoCandidates(memos, today, PAST_MEMO_LIMIT).map((p) => ({
    heading: PAST_MEMO_HEADING[p.reason],
    memo: toItem(p.memo),
  }));
}

function countByCategory(
  memos: readonly Pick<MemoRecord, "categoryId">[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of memos) {
    if (m.categoryId)
      counts.set(m.categoryId, (counts.get(m.categoryId) ?? 0) + 1);
  }
  return counts;
}

function draftSummary(
  draft: draftsRepo.MemoDraft,
  categories: readonly MemoCategory[],
): { date: LogicalDate; categoryName: string | null } {
  return {
    date: draft.date,
    categoryName:
      categories.find((c) => c.id === draft.categoryId)?.name ?? null,
  };
}

/**
 * カレンダーの日ごとの状態。目標を達成：1日の目標があるカテゴリをすべて達成した日
 * （目標のカテゴリがなければ、書いた日はすべて「書いた」）。書いた：1件以上。なし：0件
 */
function calendarOf(
  categories: readonly MemoCategory[],
  memos: readonly MemoRecord[],
  from: LogicalDate,
  to: LogicalDate,
): { date: LogicalDate; status: MemoDayStatus }[] {
  const total = countByDate(memos);
  const targeted = categories.filter((c) => c.dailyTarget !== null);
  const perCategory = targeted.map((c) => ({
    target: c.dailyTarget!,
    counts: countByDate(memos, c.id),
  }));
  const days: { date: LogicalDate; status: MemoDayStatus }[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const written = (total.get(date) ?? 0) > 0;
    const achieved =
      perCategory.length > 0 &&
      perCategory.every((c) => (c.counts.get(date) ?? 0) >= c.target);
    days.push({
      date,
      status: achieved ? "achieved" : written ? "written" : "none",
    });
  }
  return days;
}

function monthStart(date: LogicalDate): LogicalDate {
  const [year, month] = splitDate(date);
  return makeLogicalDate(year, month, 1);
}

/** n か月後の同じ月の1日（月をまたぐ計算用。日は1日にそろえる） */
function addMonths(date: LogicalDate, months: number): LogicalDate {
  const [year, month] = splitDate(date);
  const index = year * 12 + (month - 1) + months;
  return makeLogicalDate(Math.floor(index / 12), (index % 12) + 1, 1);
}

function parseMonth(value: string | undefined): [number, number] | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? [year, month] : null;
}
