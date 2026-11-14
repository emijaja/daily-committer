import { describe, expect, it } from "vitest";
import {
  checkHabit,
  createHabit,
  createUser,
  d,
  incrementHabit,
} from "@/server/testing/factories";
import { exportEntriesCsv } from "./export";
import { archiveHabit } from "./habits";
import { addQuantity, toggleCheck } from "./record";

/** 見出しを除いた行 */
const rows = (csv: string) =>
  csv.replace(/^﻿/, "").trimEnd().split("\r\n").slice(1);

describe("exportEntriesCsv", () => {
  it("自分の記録だけを、過去の習慣も含めて書き出す", async () => {
    const me = await createUser();
    const other = await createUser();
    const reading = await createHabit(me, checkHabit({ name: "読書" }));
    const run = await createHabit(me, incrementHabit());
    const othersHabit = await createHabit(
      other,
      checkHabit({ name: "他人の習慣" }),
    );

    await toggleCheck(me, reading, d("2024-11-01"));
    await addQuantity(me, run, d("2024-10-28"), 3.2);
    await addQuantity(me, run, d("2024-10-28"), 1);
    await toggleCheck(other, othersHabit, d("2024-11-01"));
    await archiveHabit(me, run);

    // 2024-11-06 12:00（Asia/Tokyo）
    const file = await exportEntriesCsv(me, new Date("2024-11-06T03:00:00Z"));
    expect(file.fileName).toBe("sanpai-2024-11-06.csv");
    expect(file.content).not.toContain("他人の習慣");
    expect(file.content).not.toContain(othersHabit);
    expect(rows(file.content)).toEqual([
      `2024-10-28,${run},ランニング,weekly,quantity,3.2,km`,
      `2024-10-28,${run},ランニング,weekly,quantity,1,km`,
      `2024-11-01,${reading},読書,daily,check,,`,
    ]);
  });

  it("記録がなければ見出しだけ", async () => {
    const me = await createUser();
    await createHabit(me);
    const file = await exportEntriesCsv(me);
    expect(rows(file.content)).toEqual([]);
  });
});
