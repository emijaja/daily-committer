"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import {
  GoalBlock,
  NumberStepper,
  PeriodSelect,
  RecordTypeSelect,
  TextField,
  Toggle,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/Pill";
import type { InputMode, Period, RecordType } from "@/domain/types";
import { CatalogSection, Sample } from "./catalog-ui";

export function FormSection() {
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<Period>("daily");
  const [recordType, setRecordType] = useState<RecordType>("check");
  const [times, setTimes] = useState(3);
  const [unit, setUnit] = useState("km");
  const [target, setTarget] = useState<number | null>(10);
  const [inputMode, setInputMode] = useState<InputMode>("increment");
  const [stepper, setStepper] = useState(10);
  const [toggle, setToggle] = useState(true);

  const goalProps = {
    timesPerPeriod: times,
    onTimesPerPeriodChange: setTimes,
    unit,
    onUnitChange: setUnit,
    quantityTarget: target,
    onQuantityTargetChange: setTarget,
    inputMode,
    onInputModeChange: setInputMode,
  };

  return (
    <>
      <CatalogSection
        id="form"
        title="フォーム部品（操作できる見本）"
        figma="2101:5270 / 2101:5345 / 2130:5659"
      >
        <TextField
          label="名前"
          placeholder="例：読書"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label="補足（任意）" defaultValue="朝、川沿いを走る" />
        <PeriodSelect value={period} onChange={setPeriod} />
        <RecordTypeSelect value={recordType} onChange={setRecordType} />
        <GoalBlock period={period} recordType={recordType} {...goalProps} />
      </CatalogSection>

      <CatalogSection id="goal-block" title="GoalBlock（状態ごと）">
        <Sample label="チェックのみ・毎日">
          <GoalBlock period="daily" recordType="check" {...goalProps} />
        </Sample>
        <Sample label="チェックのみ・毎週（週3回）">
          <GoalBlock period="weekly" recordType="check" {...goalProps} />
        </Sample>
        <Sample label="チェックのみ・毎月">
          <GoalBlock period="monthly" recordType="check" {...goalProps} />
        </Sample>
        <Sample label="量も記録・毎週（目標 10 km・回ごとに足す）">
          <GoalBlock
            period="weekly"
            recordType="quantity"
            {...goalProps}
            quantityTarget={10}
            inputMode="increment"
          />
        </Sample>
        <Sample label="量も記録・毎日（目標なし・合計を入力）">
          <GoalBlock
            period="daily"
            recordType="quantity"
            {...goalProps}
            quantityTarget={null}
            inputMode="total"
          />
        </Sample>
      </CatalogSection>

      <CatalogSection id="number-stepper" title="NumberStepper / Toggle">
        <Sample label="数値の±（最小 0）">
          <NumberStepper
            label="目標"
            value={stepper}
            onChange={setStepper}
            unit="km"
          />
        </Sample>
        <Sample label="最小に達した（− は押せない）">
          <NumberStepper
            label="回数"
            value={1}
            onChange={() => {}}
            min={1}
            unit="回"
          />
        </Sample>
        <Sample label="トグル（ON／OFF／押せる）">
          <div className="flex items-center gap-4">
            <Toggle label="ON" checked onChange={() => {}} />
            <Toggle label="OFF" checked={false} onChange={() => {}} />
            <Toggle
              label="ぼやきを表示"
              checked={toggle}
              onChange={setToggle}
            />
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="empty-state"
        title="EmptyState"
        figma="2107:5379 / 2107:5458 / 2107:5537 / 2107:5981"
      >
        <Sample label="E1 記録：習慣がまだない" bleed>
          <EmptyState
            expression="normal"
            title="まだ習慣がありません"
            description={
              "ぶら下がってるだけの毎日も、わるくないけど…。\nまずは1つ、登録してみよう。"
            }
            actions={
              <>
                <Pill leading={<Icon name="plus" size={14} />}>
                  習慣を追加する
                </Pill>
                <Link
                  href="/dev/components"
                  className="min-h-11 content-center text-[12px] font-bold underline underline-offset-2"
                >
                  おすすめから選ぶ
                </Link>
              </>
            }
          />
        </Sample>
        <Sample label="E2 記録：今週の習慣がない" bleed>
          <EmptyState
            expression="sleepy"
            mascotSize={180}
            title="週の習慣はまだないよ"
            description={
              "「週3回ランニング」のように、\n週ごとの回数で続ける習慣を追加できます。"
            }
            actions={
              <Pill
                variant="secondary"
                leading={<Icon name="plus" size={14} />}
              >
                週の習慣を追加
              </Pill>
            }
          />
        </Sample>
        <Sample label="E4 記録の確認：始める前の日（キャラなし）" bleed>
          <EmptyState
            expression={null}
            title="この日は、まだ習慣を始める前です"
            description="いちばん古い記録は 10月8日（火）から。"
            actions={<Pill variant="secondary">最初の記録の日へ</Pill>}
          />
        </Sample>
      </CatalogSection>
    </>
  );
}
