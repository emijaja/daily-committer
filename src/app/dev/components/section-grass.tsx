"use client";

import { useState } from "react";
import { CalendarModal } from "@/components/CalendarModal";
import { daysInMonth, toIsoDate } from "@/components/calendar-layout";
import { GrassCard, GrassHeatmap } from "@/components/GrassHeatmap";
import { StatBox, StatMoreBox } from "@/components/StatBox";
import type { GrassCell, GrassLevel } from "@/domain/grass";
import type { LogicalDate } from "@/domain/types";
import { CatalogSection, FixedFrame, Sample } from "./catalog-ui";

const TODAY = "2024-11-01" as LogicalDate;

/** 見本の草（決まった並びの擬似乱数） */
function yearCells(year: number, pick: (i: number) => GrassLevel) {
  const cells: GrassCell[] = [];
  let i = 0;
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= daysInMonth(year, m); d++) {
      const date = toIsoDate(year, m, d) as LogicalDate;
      cells.push({ date, level: date > TODAY ? 0 : pick(i) });
      i++;
    }
  }
  return cells;
}

const rand = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const LEVELS = yearCells(2024, (i) => {
  // 年の後半ほど濃くする
  const r = rand(i) + i / 600;
  return (r < 0.6 ? 0 : r < 0.85 ? 1 : r < 1.05 ? 2 : 3) as GrassLevel;
});
const BINARY = yearCells(2024, (i) => (rand(i) + i / 800 > 0.55 ? 3 : 0));
const EMPTY = yearCells(2024, () => 0);

export function GrassSection() {
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState({ year: 2024, month: 10 });
  const [selected, setSelected] = useState<LogicalDate>(
    "2024-10-29" as LogicalDate,
  );
  const [log, setLog] = useState("（まだ押していません）");

  const openMonth = (date: LogicalDate) => {
    setYm({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) });
    setOpen(true);
    setLog(`${date} を押した`);
  };
  const monthCells = LEVELS.filter((c) =>
    c.date.startsWith(toIsoDate(ym.year, ym.month, 1).slice(0, 7)),
  );

  return (
    <>
      <CatalogSection
        id="grass"
        title="GrassHeatmap / GrassCard"
        figma="2098:5251 / 2100:5238 / 2107:5537"
      >
        <Sample label="4段階（すべての習慣）・押すとカレンダー">
          <GrassCard
            year={2024}
            summary="記録 499件"
            cells={LEVELS}
            weekStart="mon"
            today={TODAY}
            onPrev={() => setLog("前の年")}
            onNext={() => setLog("次の年")}
            canNext={false}
            onCellPress={openMonth}
          />
          <p className="text-caption mt-1 text-gray-500">{log}</p>
        </Sample>
        <Sample label="2値（習慣ごと・凡例とヒントなし）">
          <GrassCard
            year={2024}
            summary="読書の記録 212日"
            cells={BINARY}
            weekStart="mon"
            today={TODAY}
            legend="none"
            hint={null}
          />
        </Sample>
        <Sample label="空（E3：全マス灰色・今日だけ黄色）">
          <GrassCard
            year={2024}
            summary="記録 0件"
            cells={EMPTY}
            weekStart="mon"
            today={TODAY}
            highlightToday
            hint="今日の記録から、ここに草が生えます"
          />
        </Sample>
        <Sample label="草だけ（日曜始まり）">
          <GrassHeatmap cells={LEVELS} weekStart="sun" today={TODAY} />
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="calendar-modal"
        title="CalendarModal"
        figma="2099:5222"
      >
        <Sample label="押すと開く（選択日は黒塗り、未来の日は押せない）">
          <button
            type="button"
            className="min-h-11 text-[12px] font-bold underline"
            onClick={() => setOpen(true)}
          >
            カレンダーを開く（{ym.year}年{ym.month}月）
          </button>
          <p className="text-caption text-gray-500">選択中：{selected}</p>
          <CalendarModal
            open={open}
            year={ym.year}
            month={ym.month}
            cells={monthCells}
            weekStart="mon"
            today={TODAY}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              setOpen(false);
            }}
            onPrev={() =>
              setYm(({ year, month }) =>
                month === 1
                  ? { year: year - 1, month: 12 }
                  : { year, month: month - 1 },
              )
            }
            onNext={() =>
              setYm(({ year, month }) =>
                month === 12
                  ? { year: year + 1, month: 1 }
                  : { year, month: month + 1 },
              )
            }
            canNext={ym.year < 2024 || ym.month < 11}
            onClose={() => setOpen(false)}
            onToday={() => {
              setSelected(TODAY);
              setOpen(false);
            }}
          />
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="calendar-modal-open"
        title="CalendarModal（開いた状態）"
      >
        <Sample label="2024年10月・29日を選択（枠の中に固定）">
          <FixedFrame height={600}>
            <CalendarModal
              open
              year={2024}
              month={10}
              cells={LEVELS.filter((c) => c.date.startsWith("2024-10"))}
              weekStart="mon"
              today={TODAY}
              selected={"2024-10-29" as LogicalDate}
              onSelect={() => {}}
              onPrev={() => {}}
              onNext={() => {}}
              onClose={() => {}}
              onToday={() => {}}
            />
          </FixedFrame>
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="stat-box"
        title="StatBox"
        figma="2098:5251 / 2100:5238"
      >
        <Sample label="lg（達成していること）＋ほか N件">
          <div className="grid grid-cols-2 gap-2.5">
            <StatBox label="読書" value={27} unit="日" caption="連続で継続中" />
            <StatBox
              label="筋トレ"
              value={5}
              unit="日"
              caption="目標超えが連続"
            />
            <StatBox
              label="ランニング"
              prefix="週"
              value={3}
              unit="回"
              caption="ペースで継続中"
            />
            <StatMoreBox
              label="ほか 4件"
              onPress={() => setLog("すべて見る")}
            />
          </div>
        </Sample>
        <Sample label="md（習慣の詳細）">
          <div className="grid grid-cols-2 gap-2.5">
            <StatBox size="md" label="最長連続" value={27} unit="日" />
            <StatBox size="md" label="今月" value={29} unit="/ 31日" />
            <StatBox size="md" label="今年の合計" value={212} unit="日" />
            <StatBox size="md" label="始めた日" value="1.8" unit="2024年" />
          </div>
        </Sample>
        <Sample label="0・長い名前">
          <div className="grid grid-cols-2 gap-2.5">
            <StatBox size="md" label="今年の合計" value={0} unit="日" />
            <StatBox
              label="毎朝コップ1杯の水を飲む"
              value={3}
              unit="日"
              caption="連続で継続中"
            />
          </div>
        </Sample>
      </CatalogSection>
    </>
  );
}
