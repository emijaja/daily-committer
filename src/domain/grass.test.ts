import { describe, expect, it } from "vitest";
import { yearRange } from "./date";
import { d, makeEntries, makeEntry, makeHabit } from "./fixtures";
import { allHabitsGrass, countRecords, habitGrass } from "./grass";

const range = (start: string, end: string) => ({
  start: d(start),
  end: d(end),
});
const levels = (cells: { level: number }[]) => cells.map((c) => c.level);

describe("allHabitsGrass", () => {
  const habits = [1, 2, 3].map((i) =>
    makeHabit({ id: `h${i}`, createdOn: d("2024-01-01") }),
  );

  it("割合で4段階（0・1/3・2/3・3/3）", () => {
    const entries = [
      makeEntry("h1", "2024-11-02"),
      ...makeEntries("h1", ["2024-11-03"]),
      makeEntry("h2", "2024-11-03"),
      makeEntry("h1", "2024-11-04"),
      makeEntry("h2", "2024-11-04"),
      makeEntry("h3", "2024-11-04"),
    ];
    const cells = allHabitsGrass(
      habits,
      entries,
      range("2024-11-01", "2024-11-04"),
    );
    expect(cells).toEqual([
      { date: "2024-11-01", level: 0 },
      { date: "2024-11-02", level: 1 }, // 1/3 ちょうど
      { date: "2024-11-03", level: 2 }, // 2/3 ちょうど
      { date: "2024-11-04", level: 3 },
    ]);
  });

  it("境界：1/3 を少し超えると2、2/3 を少し超えると3", () => {
    const five = [1, 2, 3, 4, 5].map((i) =>
      makeHabit({ id: `f${i}`, createdOn: d("2024-01-01") }),
    );
    const day = (n: number, date: string) =>
      five.slice(0, n).map((h) => makeEntry(h.id, date));
    const entries = [
      ...day(1, "2024-11-01"), // 0.2
      ...day(2, "2024-11-02"), // 0.4
      ...day(3, "2024-11-03"), // 0.6
      ...day(4, "2024-11-04"), // 0.8
    ];
    expect(
      levels(allHabitsGrass(five, entries, range("2024-11-01", "2024-11-04"))),
    ).toEqual([1, 2, 2, 3]);
  });

  it("分母はその日に現在の習慣だった数（作る前・過去にした日以降は除く）", () => {
    const a = makeHabit({ id: "a", createdOn: d("2024-11-01") });
    const b = makeHabit({ id: "b", createdOn: d("2024-11-03") });
    const c = makeHabit({
      id: "c",
      createdOn: d("2024-11-01"),
      archivedOn: d("2024-11-03"),
    });
    const entries = [
      makeEntry("a", "2024-11-02"), // 現在：a, c → 1/2
      makeEntry("a", "2024-11-03"), // 現在：a, b → 1/2
      makeEntry("c", "2024-11-03"), // c は過去の習慣なので数えない
      makeEntry("b", "2024-11-02"), // b は作る前なので数えない
    ];
    expect(
      levels(
        allHabitsGrass([a, b, c], entries, range("2024-10-31", "2024-11-03")),
      ),
    ).toEqual([0, 0, 2, 2]);
  });

  it("週次・月次の習慣もその日の記録で1と数える。同じ日の複数行は1つ", () => {
    const weekly = makeHabit({
      id: "w",
      period: "weekly",
      timesPerPeriod: 3,
      createdOn: d("2024-01-01"),
    });
    const daily = makeHabit({ id: "dd", createdOn: d("2024-01-01") });
    const entries = [
      makeEntry("w", "2024-11-01"),
      makeEntry("dd", "2024-11-02", 1),
      makeEntry("dd", "2024-11-02", 2),
    ];
    expect(
      levels(
        allHabitsGrass(
          [weekly, daily],
          entries,
          range("2024-11-01", "2024-11-02"),
        ),
      ),
    ).toEqual([2, 2]);
  });

  it("習慣がない・範囲外の記録", () => {
    expect(
      levels(
        allHabitsGrass(
          [],
          [makeEntry("x", "2024-11-01")],
          range("2024-11-01", "2024-11-01"),
        ),
      ),
    ).toEqual([0]);
    expect(
      levels(
        allHabitsGrass(
          habits,
          [makeEntry("h1", "2024-10-31")],
          range("2024-11-01", "2024-11-01"),
        ),
      ),
    ).toEqual([0]);
  });

  it("1年分（うるう年）は366マス", () => {
    expect(allHabitsGrass(habits, [], yearRange(2024))).toHaveLength(366);
  });
});

describe("habitGrass", () => {
  it("記録があれば3、なければ0。ほかの習慣は無視", () => {
    const entries = [
      makeEntry("a", "2024-11-01"),
      makeEntry("a", "2024-11-03", 5),
      makeEntry("b", "2024-11-02"),
    ];
    expect(habitGrass("a", entries, range("2024-11-01", "2024-11-03"))).toEqual(
      [
        { date: "2024-11-01", level: 3 },
        { date: "2024-11-02", level: 0 },
        { date: "2024-11-03", level: 3 },
      ],
    );
  });

  it("範囲外の記録は無視する", () => {
    const entries = [
      makeEntry("a", "2024-10-31"),
      makeEntry("a", "2024-11-04"),
    ];
    expect(habitGrass("a", entries, range("2024-11-01", "2024-11-02"))).toEqual(
      [
        { date: "2024-11-01", level: 0 },
        { date: "2024-11-02", level: 0 },
      ],
    );
  });
});

describe("countRecords", () => {
  it("（習慣, 日）の組の数。同じ日の複数行は1件、範囲外は数えない", () => {
    const entries = [
      makeEntry("a", "2024-01-01"),
      makeEntry("a", "2024-01-01", 2),
      makeEntry("b", "2024-01-01"),
      makeEntry("a", "2024-12-31"),
      makeEntry("a", "2025-01-01"),
      makeEntry("a", "2023-12-31"),
    ];
    expect(countRecords(entries, yearRange(2024))).toBe(3);
    expect(countRecords([], yearRange(2024))).toBe(0);
  });
});
