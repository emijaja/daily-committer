"use client";

import { useState } from "react";
import { AddButton, CheckBox } from "@/components/CheckBox";
import { HabitList, HabitRow } from "@/components/HabitRow";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionHeading } from "@/components/SectionHeading";
import { SummaryCard } from "@/components/SummaryCard";
import { Tag } from "@/components/Tag";
import { Toast } from "@/components/Toast";
import { WeekDots, type WeekDay } from "@/components/WeekDots";
import { CatalogSection, Sample } from "./catalog-ui";

const LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 曜日の見本を作る。done: 記録した日の添字、today: 今日の添字 */
function week(done: number[], today: number): WeekDay[] {
  return LABELS.map((label, i) => ({
    label,
    done: done.includes(i),
    future: i > today,
    highlight: i === today,
  }));
}

export function RecordSection() {
  const [checked, setChecked] = useState(false);
  const [reading, setReading] = useState(true);
  const [days, setDays] = useState(() => week([0, 1], 6));
  const [toastOpen, setToastOpen] = useState(true);
  const [log, setLog] = useState("（まだ操作していません）");

  return (
    <>
      <CatalogSection id="check-box" title="CheckBox / AddButton">
        <Sample label="未・完了・次に押す所（黄色）・押せる見本">
          <div className="flex items-center gap-4">
            <CheckBox label="未" checked={false} />
            <CheckBox label="完了" checked />
            <CheckBox label="次に押す所" checked={false} highlight />
            <CheckBox label="押せる" checked={checked} onChange={setChecked} />
          </div>
        </Sample>
        <Sample label="＋（未達成）・達成後（黒塗りのチェック）・長押しできる見本">
          <div className="flex items-center gap-4">
            <AddButton label="記録" />
            <AddButton label="追加・修正" done />
            <AddButton
              label="長押し"
              onPress={() => setLog("＋を押した")}
              onLongPress={() => setLog("＋を長押しした")}
            />
            <span className="text-caption text-gray-500">{log}</span>
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection id="progress-bar" title="ProgressBar">
        <Sample label="0% ／ 67% ／ 100% ／ 目標超え（130% → 満タン）">
          <div className="space-y-3">
            <ProgressBar value={0} />
            <ProgressBar value={20 / 30} />
            <ProgressBar value={1} />
            <ProgressBar value={1.3} />
          </div>
        </Sample>
        <Sample label="シートの中（高さ 6）">
          <ProgressBar value={6.2 / 10} size="sheet" />
        </Sample>
      </CatalogSection>

      <CatalogSection id="week-dots" title="WeekDots" figma="2098:5967">
        <Sample label="今日＝金（未記録の今日・未来は灰色）">
          <WeekDots days={week([0, 2], 4)} />
        </Sample>
        <Sample label="今日＝金・記録済み">
          <WeekDots days={week([1, 4], 4)} />
        </Sample>
        <Sample label="空（記録なし・今日＝月）">
          <WeekDots days={week([], 0)} />
        </Sample>
        <Sample label="押せる（② の修正）">
          <WeekDots
            days={days}
            onDayPress={(i) =>
              setDays((prev) =>
                prev.map((d, j) => (j === i ? { ...d, done: !d.done } : d)),
              )
            }
          />
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="habit-row"
        title="HabitRow"
        figma="2098:5203 / 2098:5967 / 2098:6035"
      >
        <Sample label="今日（チェック：達成・未／量：未達成）">
          <HabitList>
            <HabitRow
              name="読書"
              caption="6日連続"
              control={{
                type: "check",
                checked: reading,
                onChange: setReading,
              }}
            />
            <HabitRow
              name="早起き"
              caption="昨日で途切れました"
              control={{ type: "check", checked: false }}
            />
            <HabitRow
              name="筋トレ"
              caption="あと 10 回で目標"
              amount={{ value: 20, target: 30, unit: "回" }}
              progress={20 / 30}
              control={{ type: "add", done: false }}
              onPress={() => setLog("筋トレの行を押した")}
            />
          </HabitList>
        </Sample>
        <Sample label="量：達成／目標超え／目標なし（量だけ）／0">
          <HabitList>
            <HabitRow
              name="筋トレ"
              caption="目標達成"
              amount={{ value: 30, target: 30, unit: "回" }}
              progress={1}
              control={{ type: "add", done: true }}
            />
            <HabitRow
              name="筋トレ"
              caption="目標超え"
              amount={{ value: 45, target: 30, unit: "回" }}
              progress={1.5}
              control={{ type: "add", done: true }}
            />
            <HabitRow
              name="水を飲む"
              caption="毎日"
              amount={{ value: 1.2, unit: "L" }}
              control={{ type: "add", done: false }}
            />
            <HabitRow
              name="筋トレ"
              caption="毎日 ・ 目標 30 回"
              amount={{ value: 0, target: 30, unit: "回" }}
              progress={0}
              control={{ type: "add", done: false }}
            />
          </HabitList>
        </Sample>
        <Sample label="今週（曜日の四角）">
          <HabitList>
            <HabitRow
              name="ランニング"
              caption="週の目標 10 km ・ あと 3.8 km"
              amount={{ value: 6.2, target: 10, unit: "km" }}
              control={{ type: "add", done: false }}
              week={{ days: week([0, 2], 4) }}
            />
            <HabitRow
              name="部屋の掃除"
              caption="週1回 ・ 達成"
              amount={{ value: 1, target: 1, unit: "回" }}
              control={{ type: "check", checked: true }}
              week={{ days: week([1], 4) }}
            />
          </HabitList>
        </Sample>
        <Sample label="今月（バー）">
          <HabitList>
            <HabitRow
              name="本を1冊読む"
              caption="月1回 ・ 達成"
              amount={{ value: 1, target: 1, unit: "冊" }}
              control={{ type: "check", checked: true }}
            />
            <HabitRow
              name="ジムに行く"
              caption="月8回 ・ あと7回"
              amount={{ value: 1, target: 8, unit: "回" }}
              progress={1 / 8}
              control={{ type: "add", done: false }}
            />
            <HabitRow
              name="家計簿をつける"
              caption="月1回 ・ 月末まで"
              amount={{ value: 0, target: 1, unit: "回" }}
              control={{ type: "check", checked: false }}
            />
          </HabitList>
        </Sample>
        <Sample label="次に押す所（O2）">
          <HabitList>
            <HabitRow
              name="読書"
              caption="毎日"
              highlight
              control={{ type: "check", checked: false }}
            />
          </HabitList>
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="section-heading"
        title="SectionHeading"
        figma="2099:5855"
      >
        <Sample label="タグ＋見出し＋件数">
          <div className="space-y-3">
            <SectionHeading tag="DAILY" title="この日" count="2 / 3" />
            <SectionHeading
              tag="WEEKLY"
              title="10/28〜11/3 の週"
              count="1 / 2"
            />
            <SectionHeading title="達成していること" />
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection id="summary-card" title="SummaryCard" figma="2098:5173">
        <Sample label="今日（途中）">
          <SummaryCard
            label="今日の記録　11月1日（金）"
            done={2}
            total={3}
            tags={
              <>
                <Tag>STREAK 6</Tag>
                <Tag variant="outline">読書 6日連続</Tag>
              </>
            }
            message="あと1つで、今日はコンプリート！"
          />
        </Sample>
        <Sample label="全部できた／タグなし">
          <SummaryCard
            label="今日の記録　11月1日（金）"
            done={3}
            total={3}
            message="今日はコンプリート！"
          />
        </Sample>
        <Sample label="0件">
          <SummaryCard label="今月の記録　2024年11月" done={0} total={3} />
        </Sample>
      </CatalogSection>

      <CatalogSection id="toast" title="Toast">
        <Sample label="取り消しつき（その場に表示）">
          <div className="space-y-2">
            <Toast
              open={toastOpen}
              floating={false}
              duration={0}
              message="筋トレ 25 回を記録しました"
              onAction={() => setToastOpen(false)}
            />
            {!toastOpen ? (
              <button
                type="button"
                className="min-h-11 text-[12px] font-bold underline"
                onClick={() => setToastOpen(true)}
              >
                もう一度出す
              </button>
            ) : null}
          </div>
        </Sample>
        <Sample label="取り消しなし（エラーの知らせ）">
          <Toast
            open
            floating={false}
            duration={0}
            message="記録できませんでした。もう一度お試しください"
          />
        </Sample>
      </CatalogSection>
    </>
  );
}
