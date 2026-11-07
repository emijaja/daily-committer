import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddButton, CheckBox } from "./CheckBox";
import { ProgressBar } from "./ProgressBar";
import { WeekDots } from "./WeekDots";

describe("CheckBox", () => {
  it("button 要素で role=checkbox と aria-checked を持つ", () => {
    const off = renderToStaticMarkup(<CheckBox label="読書" checked={false} />);
    expect(off).toMatch(/^<button/);
    expect(off).toContain('role="checkbox"');
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain('aria-label="読書"');

    const on = renderToStaticMarkup(<CheckBox label="読書" checked />);
    expect(on).toContain('aria-checked="true"');
  });

  it("AddButton は button 要素でラベルを持つ", () => {
    const html = renderToStaticMarkup(<AddButton label="筋トレを記録" />);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('aria-label="筋トレを記録"');
  });
});

describe("ProgressBar", () => {
  it.each([
    [-0.5, "0"],
    [0.5, "50"],
    [1.3, "100"],
    [Number.NaN, "0"],
  ])("value=%s のとき aria-valuenow=%s", (value, now) => {
    const html = renderToStaticMarkup(<ProgressBar value={value} />);
    expect(html).toContain(`aria-valuenow="${now}"`);
  });
});

describe("WeekDots", () => {
  const days = [
    { label: "月", done: true },
    { label: "火", done: false, highlight: true },
    { label: "水", done: false, future: true },
  ];

  it("押せないときは記録の有無を読み上げる", () => {
    const html = renderToStaticMarkup(<WeekDots days={days} />);
    expect(html).toContain("月：記録あり");
    expect(html).toContain("火：記録なし");
    expect(html).toContain("水：これから");
  });

  it("押せるときは button で、未来の日は押せない", () => {
    const html = renderToStaticMarkup(
      <WeekDots days={days} onDayPress={() => {}} />,
    );
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });
});
