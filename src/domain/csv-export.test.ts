import { describe, expect, it } from "vitest";
import { buildEntriesCsv, exportFileName } from "./csv-export";
import { makeEntry, makeHabit } from "./fixtures";

const lines = (csv: string) => csv.replace(/^﻿/, "").split("\r\n");

describe("buildEntriesCsv", () => {
  it("BOM・見出し・CRLF で、記録1件を1行にする", () => {
    const reading = makeHabit({ id: "h1", name: "読書" });
    const workout = makeHabit({
      id: "h2",
      name: "筋トレ",
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "total",
    });
    const csv = buildEntriesCsv(
      [reading, workout],
      [makeEntry("h1", "2024-11-01"), makeEntry("h2", "2024-11-01", 20.5)],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(lines(csv)).toEqual([
      "date,habit_id,habit_name,period,record_type,quantity,unit",
      "2024-11-01,h1,読書,daily,check,,",
      "2024-11-01,h2,筋トレ,daily,quantity,20.5,回",
      "",
    ]);
  });

  it("記録がなければ見出しだけ", () => {
    expect(lines(buildEntriesCsv([makeHabit()], []))).toEqual([
      "date,habit_id,habit_name,period,record_type,quantity,unit",
      "",
    ]);
  });

  it("回ごとに足す習慣は同じ日でも1件ずつ書き出し、渡した順を保つ", () => {
    const run = makeHabit({
      id: "run",
      name: "ランニング",
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      inputMode: "increment",
    });
    const csv = buildEntriesCsv(
      [run],
      [
        makeEntry("run", "2024-10-28", 3.2),
        makeEntry("run", "2024-10-28", 1),
        makeEntry("run", "2024-10-30", 3),
      ],
    );
    expect(lines(csv).slice(1, 4)).toEqual([
      "2024-10-28,run,ランニング,weekly,quantity,3.2,km",
      "2024-10-28,run,ランニング,weekly,quantity,1,km",
      "2024-10-30,run,ランニング,weekly,quantity,3,km",
    ]);
  });

  it("カンマ・ダブルクォート・改行を含む名前はクォートする", () => {
    const h = makeHabit({ id: "h", name: 'ストレッチ, "朝"\n夜' });
    const csv = buildEntriesCsv([h], [makeEntry("h", "2024-11-01")]);
    expect(csv).toContain('2024-11-01,h,"ストレッチ, ""朝""\n夜",daily');
  });

  it("式として実行されそうな文字列は ' を付けて無害にする", () => {
    const h = makeHabit({
      id: "h",
      name: "=HYPERLINK(1)",
      recordType: "quantity",
      unit: "+1",
      inputMode: "total",
    });
    const csv = buildEntriesCsv([h], [makeEntry("h", "2024-11-01", 1)]);
    expect(lines(csv)[1]).toBe(
      "2024-11-01,h,'=HYPERLINK(1),daily,quantity,1,'+1",
    );
  });

  it("習慣の見つからない記録は書き出さない", () => {
    const csv = buildEntriesCsv([], [makeEntry("missing", "2024-11-01")]);
    expect(lines(csv)).toHaveLength(2);
  });
});

describe("exportFileName", () => {
  it("今日の日付を入れる", () => {
    expect(exportFileName("2024-11-06")).toBe("confidently-2024-11-06.csv");
  });
});
