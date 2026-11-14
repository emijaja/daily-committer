import { describe, expect, it } from "vitest";
import { afterLogin } from "./after-login";

describe("afterLogin", () => {
  it("サイト内のパスはそのまま戻る", () => {
    expect(afterLogin("/review?year=2025")).toBe("/review?year=2025");
  });

  it.each([undefined, ["/a", "/b"], "//evil.com", "https://evil.com"])(
    "ない・不正な値 %j は入口（/）へ",
    (next) => {
      expect(afterLogin(next)).toBe("/");
    },
  );
});
