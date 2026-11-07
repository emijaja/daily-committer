"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { NumPad } from "@/components/NumPad";
import { Pill } from "@/components/Pill";
import { QuantityIncrementSheet } from "@/components/QuantityIncrementSheet";
import { QuantityTotalSheet } from "@/components/QuantityTotalSheet";
import { CatalogSection, FixedFrame, Sample } from "./catalog-ui";

const noop = () => {};

const RUNNING_ITEMS = [
  { id: "e1", dateLabel: "月 10/28", quantity: 3.2 },
  { id: "e2", dateLabel: "水 10/30", quantity: 3.0 },
];

export function SheetSection() {
  const [pad, setPad] = useState("2.5");
  const [padInt, setPadInt] = useState("");
  const [sheet, setSheet] = useState<null | "plain" | "total" | "inc">(null);
  const [log, setLog] = useState("（まだ操作していません）");

  return (
    <>
      <CatalogSection id="num-pad" title="NumPad" figma="2101:5429">
        <Sample label={`小数あり（入力：${pad || "空"}）`}>
          <NumPad value={pad} onChange={setPad} />
        </Sample>
        <Sample label={`整数だけ（入力：${padInt || "空"}）`}>
          <NumPad value={padInt} onChange={setPadInt} decimals={0} />
        </Sample>
      </CatalogSection>

      <CatalogSection id="bottom-sheet" title="BottomSheet">
        <Sample label="押すと開く（暗幕・Esc・× で閉じる）">
          <div className="flex flex-wrap gap-2">
            <Pill size="md" onClick={() => setSheet("plain")}>
              BottomSheet
            </Pill>
            <Pill size="md" onClick={() => setSheet("total")}>
              合計を入力
            </Pill>
            <Pill size="md" onClick={() => setSheet("inc")}>
              回ごとに足す
            </Pill>
          </div>
          <p className="text-caption mt-1 text-gray-500">{log}</p>
          <BottomSheet
            open={sheet === "plain"}
            onClose={() => setSheet(null)}
            title="Sheet"
            subtitle="中身は自由に入れられます"
          >
            <p className="text-body">ボトムシートの中身。</p>
            <Pill className="mt-6" onClick={() => setSheet(null)}>
              閉じる
            </Pill>
          </BottomSheet>
          <QuantityTotalSheet
            key={sheet === "total" ? "total-open" : "total"}
            open={sheet === "total"}
            onClose={() => setSheet(null)}
            title="Workout"
            habitName="筋トレ"
            dateLabel="11月1日（金）"
            unit="回"
            target={30}
            initialValue={20}
            onSubmit={(v) => {
              setLog(`合計 ${v} 回で記録`);
              setSheet(null);
            }}
          />
          <QuantityIncrementSheet
            key={sheet === "inc" ? "inc-open" : "inc"}
            open={sheet === "inc"}
            onClose={() => setSheet(null)}
            title="Running"
            habitName="ランニング"
            periodLabel="10/28〜11/3"
            totalLabel="今週の合計"
            unit="km"
            target={10}
            total={6.2}
            items={RUNNING_ITEMS}
            onItemPress={(id) => setLog(`${id} を押した`)}
            addLabel="今日（金 11/1）の分を追加"
            onAdd={(a) => {
              setLog(`${a} km を追加`);
              setSheet(null);
            }}
          />
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="quantity-total-sheet"
        title="QuantityTotalSheet（開いた状態）"
        figma="2098:5748"
      >
        <Sample label="未達成（20 / 30 回）">
          <FixedFrame height={520}>
            <QuantityTotalSheet
              open
              onClose={noop}
              title="Workout"
              habitName="筋トレ"
              dateLabel="11月1日（金）"
              unit="回"
              target={30}
              initialValue={20}
              onSubmit={noop}
            />
          </FixedFrame>
        </Sample>
        <Sample label="目標超え（35 / 30 回）">
          <FixedFrame height={520}>
            <QuantityTotalSheet
              open
              onClose={noop}
              title="Workout"
              habitName="筋トレ"
              dateLabel="11月1日（金）"
              unit="回"
              target={30}
              initialValue={35}
              onSubmit={noop}
            />
          </FixedFrame>
        </Sample>
        <Sample label="目標なし（0 L）">
          <FixedFrame height={440}>
            <QuantityTotalSheet
              open
              onClose={noop}
              title="Water"
              habitName="水を飲む"
              dateLabel="11月1日（金）"
              unit="L"
              target={null}
              initialValue={0}
              steps={[0.5, 1]}
              onSubmit={noop}
            />
          </FixedFrame>
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="quantity-increment-sheet"
        title="QuantityIncrementSheet（開いた状態）"
        figma="2101:5429"
      >
        <Sample label="記録2件（6.2 / 10 km）">
          <FixedFrame height={660}>
            <QuantityIncrementSheet
              open
              onClose={noop}
              title="Running"
              habitName="ランニング"
              periodLabel="10/28〜11/3"
              totalLabel="今週の合計"
              unit="km"
              target={10}
              total={6.2}
              items={RUNNING_ITEMS}
              onItemPress={noop}
              addLabel="今日（金 11/1）の分を追加"
              onAdd={noop}
            />
          </FixedFrame>
        </Sample>
        <Sample label="空（記録なし・目標なし）">
          <FixedFrame height={600}>
            <QuantityIncrementSheet
              open
              onClose={noop}
              title="Running"
              habitName="ランニング"
              periodLabel="10/28〜11/3"
              totalLabel="今週の合計"
              unit="km"
              target={null}
              total={0}
              items={[]}
              addLabel="今日（金 11/1）の分を追加"
              onAdd={noop}
            />
          </FixedFrame>
        </Sample>
      </CatalogSection>
    </>
  );
}
