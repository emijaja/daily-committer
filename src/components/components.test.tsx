import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddButton, CheckBox } from "./CheckBox";
import { NumberStepper, SegmentedControl, Toggle } from "./forms";
import { PresetChips } from "./PresetChips";
import { ProgressBar } from "./ProgressBar";
import { WeekDots } from "./WeekDots";

describe("フォーム部品", () => {
  it("SegmentedControl は radiogroup と radio で選択中を示す", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        label="周期"
        value="weekly"
        onChange={() => {}}
        options={[
          { value: "daily", label: "毎日" },
          { value: "weekly", label: "毎週" },
        ]}
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });

  it("NumberStepper は既定では数字を表示だけ、editable なら直接入力の欄にする", () => {
    const plain = renderToStaticMarkup(
      <NumberStepper label="回数" value={3} onChange={() => {}} unit="回" />,
    );
    expect(plain).toContain("<output");
    expect(plain).not.toContain("<input");

    const editable = renderToStaticMarkup(
      <NumberStepper
        label="1週間の目標"
        value={2.5}
        onChange={() => {}}
        unit="km"
        editable
        decimals={3}
      />,
    );
    expect(editable).toContain('inputMode="decimal"');
    expect(editable).toContain('value="2.5"');
    expect(editable).toContain('aria-label="1週間の目標（km）"');
  });

  it("NumberStepper の decimals が NaN・負数なら小数なし、小数なら切り捨てて扱う", () => {
    const render = (decimals: number) =>
      renderToStaticMarkup(
        <NumberStepper
          label="回数"
          value={3}
          onChange={() => {}}
          editable
          decimals={decimals}
        />,
      );
    expect(render(Number.NaN)).toContain('inputMode="numeric"');
    expect(render(-1)).toContain('inputMode="numeric"');
    expect(render(0.5)).toContain('inputMode="numeric"');
    expect(render(1.9)).toContain('inputMode="decimal"');
  });

  it("Toggle は role=switch と aria-checked を持つ", () => {
    const html = renderToStaticMarkup(
      <Toggle label="ぼやきを表示" checked onChange={() => {}} />,
    );
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });
});

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

describe("PresetChips", () => {
  it("選んだものと登録済みは aria-pressed、登録済みは押せない。自分で作るはリンクにできる", () => {
    const html = renderToStaticMarkup(
      <PresetChips
        items={[
          { name: "読書", selected: true },
          { name: "早起き", selected: false },
          { name: "筋トレ", selected: false, registered: true },
        ]}
        onToggle={() => {}}
        custom={{ href: "/habits/new" }}
      />,
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain("筋トレ（登録済み）");
    expect(html).toContain('href="/habits/new"');
  });
});
