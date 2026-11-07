import { describe, expect, it } from "vitest";
import { applyNumPadKey, formatQuantity, parseQuantity } from "./quantity";

describe("formatQuantity", () => {
  it("小数の誤差を丸める", () => {
    expect(formatQuantity(6.2 + 2.5)).toBe("8.7");
    expect(formatQuantity(0.1 + 0.2)).toBe("0.3");
    expect(formatQuantity(20)).toBe("20");
    expect(formatQuantity(Number.NaN)).toBe("0");
  });
});

describe("applyNumPadKey", () => {
  it("数字を足す・先頭の 0 を置き換える", () => {
    expect(applyNumPadKey("", "2")).toBe("2");
    expect(applyNumPadKey("0", "5")).toBe("5");
    expect(applyNumPadKey("12", "3")).toBe("123");
  });

  it("小数点は1つだけ、空なら 0. にする", () => {
    expect(applyNumPadKey("", ".")).toBe("0.");
    expect(applyNumPadKey("2", ".")).toBe("2.");
    expect(applyNumPadKey("2.5", ".")).toBe("2.5");
  });

  it("小数の桁数の上限を守る", () => {
    expect(applyNumPadKey("2.55", "1")).toBe("2.55");
    expect(applyNumPadKey("2.5", "1", { decimals: 1 })).toBe("2.5");
    expect(applyNumPadKey("2", ".", { decimals: 0 })).toBe("2");
  });

  it("整数部の桁数の上限を守る", () => {
    expect(applyNumPadKey("999", "9", { maxIntegerDigits: 3 })).toBe("999");
  });

  it("1文字消す", () => {
    expect(applyNumPadKey("2.5", "backspace")).toBe("2.");
    expect(applyNumPadKey("", "backspace")).toBe("");
  });
});

describe("parseQuantity", () => {
  it("空や小数点だけは 0", () => {
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity("0.")).toBe(0);
    expect(parseQuantity("2.5")).toBe(2.5);
  });
});
