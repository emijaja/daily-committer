import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["/record/today", "/record/today"],
    ["/review?habit=abc&year=2025", "/review?habit=abc&year=2025"],
    ["/habits/1#top", "/habits/1#top"],
  ])("サイト内のパス %s はそのまま返す", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    undefined,
    ["/a"],
    "",
    "record/today",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
  ])("外部へ飛ぶ・不正な値 %j は既定の画面にする", (input) => {
    expect(safeNext(input)).toBe(DEFAULT_AFTER_LOGIN);
  });
});
