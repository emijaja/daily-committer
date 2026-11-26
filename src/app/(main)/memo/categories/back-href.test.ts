import { describe, expect, it } from "vitest";
import { categoryBackHref } from "./back-href";

describe("categoryBackHref", () => {
  it("メモの画面のパスならそのまま使う", () => {
    expect(categoryBackHref("/memo/new?category=x")).toBe(
      "/memo/new?category=x",
    );
    expect(categoryBackHref(["/memo/all", "/x"])).toBe("/memo/all");
    expect(categoryBackHref("/memo")).toBe("/memo");
  });

  it("それ以外・なしは ⑨ に戻す", () => {
    expect(categoryBackHref(undefined)).toBe("/memo");
    expect(categoryBackHref("https://example.com/memo")).toBe("/memo");
    expect(categoryBackHref("//example.com/memo")).toBe("/memo");
    expect(categoryBackHref("/memorial")).toBe("/memo");
    expect(categoryBackHref("/habits")).toBe("/memo");
  });
});
