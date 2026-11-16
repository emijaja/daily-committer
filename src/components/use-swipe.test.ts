import { describe, expect, it } from "vitest";
import { createSwipeTracker, SWIPE_EDGE, swipeStep } from "./use-swipe";

describe("swipeStep", () => {
  it("左へ払うと次へ、右へ払うと前へ", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, -5)).toBe(-1);
  });

  it("短い移動はスワイプにしない", () => {
    expect(swipeStep(-49, 0)).toBe(0);
    expect(swipeStep(30, 0)).toBe(0);
  });

  it("縦や斜めの動き（縦スクロール）はスワイプにしない", () => {
    expect(swipeStep(-80, 200)).toBe(0);
    expect(swipeStep(80, 41)).toBe(0);
    expect(swipeStep(80, 40)).toBe(-1);
  });
});

describe("createSwipeTracker", () => {
  const WIDTH = 390;
  const ctx = { width: WIDTH, touches: 1, ignored: false };

  it("1本の指で左右に払うと向きを返す", () => {
    const t = createSwipeTracker();
    t.start({ x: 200, y: 300 }, ctx);
    t.move({ x: 150, y: 302 });
    expect(t.end({ x: 100, y: 305 })).toBe(1);

    t.start({ x: 100, y: 300 }, ctx);
    expect(t.end({ x: 200, y: 300 })).toBe(-1);
  });

  it("画面の左右の端から始めた指は無視する", () => {
    const t = createSwipeTracker();
    t.start({ x: SWIPE_EDGE, y: 300 }, ctx);
    expect(t.end({ x: SWIPE_EDGE + 100, y: 300 })).toBe(0);

    t.start({ x: WIDTH - SWIPE_EDGE, y: 300 }, ctx);
    expect(t.end({ x: WIDTH - SWIPE_EDGE - 100, y: 300 })).toBe(0);

    t.start({ x: SWIPE_EDGE + 1, y: 300 }, ctx);
    expect(t.end({ x: SWIPE_EDGE + 101, y: 300 })).toBe(-1);
  });

  it("スワイプしない要素（長押しのある＋など）の中で始めた指は無視する", () => {
    const t = createSwipeTracker();
    t.start({ x: 200, y: 300 }, { ...ctx, ignored: true });
    expect(t.end({ x: 100, y: 300 })).toBe(0);
  });

  it("2本目の指が触れたら（つまんで拡大）、そのタッチは捨てる", () => {
    const t = createSwipeTracker();
    t.start({ x: 200, y: 300 }, ctx);
    t.start({ x: 200, y: 300 }, { ...ctx, touches: 2 });
    expect(t.end({ x: 100, y: 300 })).toBe(0);
  });

  it("縦にスクロールして戻ってきた動きは、終点の縦の差が小さくてもスワイプにしない", () => {
    const t = createSwipeTracker();
    t.start({ x: 200, y: 300 }, ctx);
    t.move({ x: 180, y: 600 });
    t.move({ x: 150, y: 310 });
    expect(t.end({ x: 140, y: 300 })).toBe(0);
  });

  it("前のタッチの縦の動きを、次のタッチに持ち越さない", () => {
    const t = createSwipeTracker();
    t.start({ x: 200, y: 300 }, ctx);
    t.move({ x: 200, y: 600 });
    t.end({ x: 200, y: 600 });

    t.start({ x: 200, y: 300 }, ctx);
    expect(t.end({ x: 100, y: 300 })).toBe(1);
  });

  it("キャンセルされたタッチや、始まりのないタッチは何もしない", () => {
    const t = createSwipeTracker();
    expect(t.end({ x: 100, y: 300 })).toBe(0);

    t.start({ x: 200, y: 300 }, ctx);
    t.cancel();
    expect(t.end({ x: 100, y: 300 })).toBe(0);
  });
});
