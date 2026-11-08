import { describe, expect, it } from "vitest";
import { evaluatePeriod, summarize } from "@/domain/achievement";
import { d, makeEntry, makeHabit } from "@/domain/fixtures";
import type { DateRange, Entry, Habit } from "@/domain/types";
import type { RecordRow, RecordView } from "@/server/services/types";
import {
  jaDate,
  rangeLabel,
  rowCaption,
  speechMeta,
  summaryLabel,
  summaryMessage,
  tabCount,
  weekDays,
} from "./record-format";
import {
  applyRecordOp,
  entriesByHabit,
  isTempId,
  recompute,
} from "./record-optimistic";

const today = d("2024-11-01"); // 金
const week: DateRange = { start: d("2024-10-28"), end: d("2024-11-03") };
const month: DateRange = { start: d("2024-11-01"), end: d("2024-11-30") };
const day: DateRange = { start: today, end: today };

function row(
  habit: Habit,
  entries: Entry[],
  range: DateRange,
  streak = { current: 0, endedLastPeriod: false },
): RecordRow {
  return {
    habit,
    progress: evaluatePeriod(habit, entries, range),
    entries,
    streak,
  };
}

describe("表示の文字列", () => {
  it("日付と期間", () => {
    expect(jaDate(today)).toBe("11月1日（金）");
    expect(rangeLabel(week)).toBe("10/28〜11/3");
    expect(summaryLabel("daily", today, day)).toBe("今日の記録　11月1日（金）");
    expect(summaryLabel("weekly", today, week)).toBe("今週の記録　10/28〜11/3");
    expect(summaryLabel("monthly", today, month)).toBe(
      "今月の記録　2024年11月",
    );
  });

  it("集計のひとことと、タブの件数", () => {
    expect(summaryMessage("daily", 2, 3)).toBe(
      "あと1つで、今日はコンプリート！",
    );
    expect(summaryMessage("weekly", 2, 2)).toBe("今週はコンプリート！");
    expect(summaryMessage("monthly", 0, 0)).toBeNull();
    expect(tabCount(2, 3)).toBe("2/3");
    expect(tabCount(0, 0)).toBe("0");
  });

  it("吹き出しの下の情報", () => {
    expect(speechMeta("daily", today, day, "21:04", 1)).toBe(
      "21:04 ・ 今日の残り 1",
    );
    expect(speechMeta("weekly", today, week, "", 0)).toBe(
      "金曜 ・ 今週の残り 2日",
    );
    expect(speechMeta("monthly", today, month, "", 0)).toBe(
      "11月 ・ 今月の残り 29日",
    );
  });

  it("週の曜日の四角", () => {
    const days = weekDays(week, today, ["2024-10-28", "2024-10-30"]);
    expect(days.map((x) => x.label).join("")).toBe("月火水木金土日");
    expect(days.map((x) => x.done)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(days[4]).toMatchObject({ highlight: true, future: false });
    expect(days[5]).toMatchObject({ highlight: false, future: true });
  });
});

describe("rowCaption", () => {
  it("日次・チェック：連続／昨日で途切れた／それ以外", () => {
    const h = makeHabit();
    const p = evaluatePeriod(h, [], day);
    expect(rowCaption(h, p, { current: 6, endedLastPeriod: false })).toBe(
      "6日連続",
    );
    expect(rowCaption(h, p, { current: 0, endedLastPeriod: true })).toBe(
      "昨日で途切れました",
    );
    expect(rowCaption(h, p, { current: 0, endedLastPeriod: false })).toBe(
      "毎日",
    );
  });

  it("日次・量：残り／達成／目標超え", () => {
    const h = makeHabit({
      recordType: "quantity",
      unit: "回",
      quantityTarget: 30,
      inputMode: "total",
    });
    const at = (q: number) =>
      rowCaption(
        h,
        evaluatePeriod(h, [makeEntry(h.id, today, q)], day),
        undefined,
      );
    expect(at(20)).toBe("あと 10 回で目標");
    expect(at(30)).toBe("目標達成");
    expect(at(45)).toBe("目標超え +15 回");
  });

  it("週次・月次", () => {
    const run = makeHabit({
      period: "weekly",
      recordType: "quantity",
      unit: "km",
      quantityTarget: 10,
      inputMode: "increment",
    });
    expect(
      rowCaption(
        run,
        evaluatePeriod(run, [makeEntry(run.id, "2024-10-28", 6.2)], week),
        undefined,
      ),
    ).toBe("週の目標 10 km ・ あと 3.8 km");

    const gym = makeHabit({ period: "monthly", timesPerPeriod: 8 });
    expect(
      rowCaption(
        gym,
        evaluatePeriod(gym, [makeEntry(gym.id, today)], month),
        undefined,
      ),
    ).toBe("月8回 ・ あと7回");

    const budget = makeHabit({ period: "monthly", timesPerPeriod: 1 });
    expect(
      rowCaption(budget, evaluatePeriod(budget, [], month), undefined),
    ).toBe("月1回 ・ 月末まで");
    const clean = makeHabit({ period: "weekly", timesPerPeriod: 1 });
    expect(
      rowCaption(
        clean,
        evaluatePeriod(clean, [makeEntry(clean.id, "2024-10-29")], week),
        undefined,
      ),
    ).toBe("週1回 ・ 達成");
  });
});

describe("楽観的更新", () => {
  const reading = makeHabit({ name: "読書" });
  const workout = makeHabit({
    name: "筋トレ",
    recordType: "quantity",
    unit: "回",
    quantityTarget: 30,
    inputMode: "total",
  });

  function view(): RecordView {
    const rows = [
      row(reading, [], day, { current: 5, endedLastPeriod: false }),
      row(workout, [makeEntry(workout.id, today, 20)], day),
    ];
    const summary = summarize(rows.map((r) => r.progress));
    return {
      period: "daily",
      today,
      range: day,
      rows,
      summary,
      tabSummaries: {
        daily: summary,
        weekly: { done: 1, total: 2 },
        monthly: { done: 0, total: 1 },
      },
      grumble: null,
      highlight: null,
    };
  }

  it("□のタップで、行・集計・タブ・連続が変わる", () => {
    const v = view();
    const state = applyRecordOp(entriesByHabit(v.rows), {
      type: "toggle",
      habitId: reading.id,
      date: today,
    });
    const next = recompute(v, state);
    expect(next.rows[0]?.progress.achieved).toBe(true);
    expect(next.rows[0]?.streak?.current).toBe(6);
    expect(next.summary).toEqual({ done: 1, total: 2 });
    expect(next.tabSummaries.weekly).toEqual({ done: 1, total: 2 });
    expect(isTempId(state[reading.id]?.[0]?.id ?? "")).toBe(true);

    // もう一度タップで元に戻る
    const back = recompute(
      v,
      applyRecordOp(state, {
        type: "toggle",
        habitId: reading.id,
        date: today,
      }),
    );
    expect(back.rows[0]?.progress.achieved).toBe(false);
    expect(back.rows[0]?.streak?.current).toBe(5);
  });

  it("合計の上書き・1回分の追加・削除", () => {
    const v = view();
    let state = entriesByHabit(v.rows);
    state = applyRecordOp(state, {
      type: "setTotal",
      habitId: workout.id,
      date: today,
      quantity: 30,
    });
    expect(recompute(v, state).rows[1]?.progress).toMatchObject({
      current: 30,
      achieved: true,
    });
    state = applyRecordOp(state, {
      type: "add",
      habitId: workout.id,
      date: today,
      quantity: 5,
    });
    expect(recompute(v, state).rows[1]?.progress.current).toBe(35);
    const first = state[workout.id]?.[0]?.id ?? "";
    state = applyRecordOp(state, { type: "delete", entryId: first });
    expect(recompute(v, state).rows[1]?.progress.current).toBe(5);
    state = applyRecordOp(state, {
      type: "setTotal",
      habitId: workout.id,
      date: today,
      quantity: 0,
    });
    expect(state[workout.id]).toEqual([]);
  });
});
