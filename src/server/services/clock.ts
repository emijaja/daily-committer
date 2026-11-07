/**
 * サーバーで決める「今日」。端末の時計には頼らず、user_settings の
 * timezone と day_start_hour から論理日付を求める（domain-spec.md 10章）。
 */
import "server-only";
import { toLogicalDate } from "@/domain/date";
import type { LogicalDate, Settings } from "@/domain/types";
import { ServiceError } from "./errors";
import { getSettings } from "./settings";

export function todayFor(settings: Settings, now: Date): LogicalDate {
  return toLogicalDate(now, settings.timezone, settings.dayStartHour);
}

/** そのユーザーにとっての今日 */
export async function getToday(
  userId: string,
  now: Date = new Date(),
): Promise<LogicalDate> {
  return todayFor(await getSettings(userId), now);
}

/**
 * 記録する日。省略したらサーバーで決めた今日。過去の日（②の修正）は指定できるが、
 * 未来の日は記録できない。
 */
export async function resolveRecordDate(
  userId: string,
  date: LogicalDate | undefined,
  now: Date = new Date(),
): Promise<LogicalDate> {
  const today = await getToday(userId, now);
  if (date === undefined) return today;
  if (date > today) {
    throw new ServiceError("invalid", "未来の日付には記録できません");
  }
  return date;
}

/** タイムゾーンでの現在の時（0〜23）。セリフの出し分けに使う */
export function hourIn(now: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}
