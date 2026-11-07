/**
 * Server Actions と service で使う入力の検証（zod）。
 * 習慣の組み合わせの規則は DB の CHECK 制約（src/db/schema.ts の quantity_fields・
 * times_per_period_scope）と同じにしている。
 */
import { z } from "zod";
import type { LogicalDate } from "@/domain/types";

/** numeric(12, 3) に収まる上限 */
const QUANTITY_MAX = 999_999_999;

export const idSchema = z.uuid();

/** 'YYYY-MM-DD' で、暦に実在する日付 */
export const logicalDateSchema = z.iso
  .date()
  .transform((value) => value as LogicalDate);

/** 記録する量（0 より大きい） */
export const quantitySchema = z.number().positive().max(QUANTITY_MAX);

/** 合計の上書き（0 なら記録を消す） */
export const quantityTotalSchema = z.number().min(0).max(QUANTITY_MAX);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const habitNameSchema = z.string().trim().min(1).max(50);

export const habitInputSchema = z
  .object({
    name: habitNameSchema,
    note: optionalText(200),
    period: z.enum(["daily", "weekly", "monthly"]),
    recordType: z.enum(["check", "quantity"]),
    timesPerPeriod: z.number().int().positive().nullable(),
    unit: optionalText(10),
    quantityTarget: quantitySchema.nullable(),
    inputMode: z.enum(["total", "increment"]).nullable(),
  })
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (input.recordType === "check") {
      if (input.unit !== null)
        issue("unit", "チェックのみの習慣に単位は不要です");
      if (input.quantityTarget !== null)
        issue("quantityTarget", "チェックのみの習慣に量の目標は不要です");
      if (input.inputMode !== null)
        issue("inputMode", "チェックのみの習慣に入力のしかたは不要です");
      if (input.period === "daily") {
        if (input.timesPerPeriod !== null)
          issue("timesPerPeriod", "毎日の習慣に回数の目標は不要です");
      } else if (input.timesPerPeriod === null) {
        issue("timesPerPeriod", "回数の目標を入力してください");
      } else {
        const max = input.period === "weekly" ? 7 : 31;
        if (input.timesPerPeriod > max)
          issue("timesPerPeriod", `回数の目標は ${max} 回までです`);
      }
    } else {
      if (input.unit === null) issue("unit", "単位を入力してください");
      if (input.inputMode === null)
        issue("inputMode", "入力のしかたを選んでください");
      if (input.timesPerPeriod !== null)
        issue("timesPerPeriod", "量の習慣は回数の目標を持ちません");
    }
  });

/** オンボーディング（O5）で選んだおすすめの習慣の名前。0件でもよい */
export const presetNamesSchema = z.array(habitNameSchema).max(20);

export const settingsPatchSchema = z
  .object({
    timezone: z
      .string()
      .refine(isValidTimezone, "タイムゾーンが正しくありません"),
    weekStart: z.enum(["mon", "sun"]),
    dayStartHour: z.number().int().min(0).max(6),
    grumbleEnabled: z.boolean(),
    grumblePush: z.boolean(),
    reminderTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻は HH:MM で指定してください")
      .nullable(),
  })
  .partial()
  .strict();

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
