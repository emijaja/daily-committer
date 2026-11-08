"use client";

import { QuantityIncrementSheet } from "@/components/QuantityIncrementSheet";
import { QuantityTotalSheet } from "@/components/QuantityTotalSheet";
import { formatQuantity } from "@/components/quantity";
import type { LogicalDate, Period } from "@/domain/types";
import type { RecordRow } from "@/server/services/types";
import {
  dowLabel,
  jaDate,
  PERIOD_LABEL,
  quantityOn,
  rangeLabel,
  shortDate,
  monthLabel,
} from "./record-format";
import { isTempId } from "./record-optimistic";

export interface QuantitySheetProps {
  /** 開いている習慣の行。null なら閉じている */
  row: RecordRow | null;
  today: LogicalDate;
  onClose: () => void;
  /** ⑧-a：今日の合計を上書きする */
  onSetTotal: (row: RecordRow, quantity: number) => void;
  /** ⑧-b：今日の分を1回追加する */
  onAdd: (row: RecordRow, quantity: number) => void;
  /** ⑧-b：記録の一覧から1件を削除する */
  onDelete: (row: RecordRow, entryId: string) => void;
}

/** 期間の表示（11月1日（金）／10/28〜11/3／2024年11月） */
function periodLabel(period: Period, row: RecordRow, today: LogicalDate) {
  if (period === "daily") return jaDate(today);
  if (period === "weekly") return rangeLabel(row.progress.range);
  return monthLabel(today);
}

/**
 * ⑧-a/b 量の記録のシート。習慣の input_mode で「合計を入力」と「回ごとに足す」を切り替える。
 * 大見出しには習慣の名前をそのまま出す（screens.md ⑧-a）。
 */
export function QuantitySheet({
  row,
  today,
  onClose,
  onSetTotal,
  onAdd,
  onDelete,
}: QuantitySheetProps) {
  const habit = row?.habit;
  const unit = habit?.unit ?? "";
  const entries = row?.entries ?? [];

  if (habit?.inputMode === "increment" && row) {
    const period = habit.period;
    return (
      <QuantityIncrementSheet
        open
        onClose={onClose}
        title={habit.name}
        habitName={habit.name}
        periodLabel={periodLabel(period, row, today)}
        totalLabel={`${PERIOD_LABEL[period]}の合計`}
        unit={unit}
        target={habit.quantityTarget}
        total={row.progress.current}
        items={entries.map((e) => ({
          id: e.id,
          dateLabel: `${dowLabel(e.date)} ${shortDate(e.date)}`,
          quantity: e.quantity ?? 0,
        }))}
        onItemDelete={(id) => {
          // 楽観的に足したばかりの記録は、サーバーの ID が届くまで消せない
          if (!isTempId(id)) onDelete(row, id);
        }}
        addLabel={`今日（${dowLabel(today)} ${shortDate(today)}）の分を追加`}
        onAdd={(amount) => onAdd(row, amount)}
      />
    );
  }

  // 合計を入力（閉じているときも描いておき、開くたびに入力を初期値に戻す）
  const daily = habit?.period === "daily";
  const todayValue = quantityOn(entries, today);
  // 週次・月次の「合計を入力」は、その日の分を入れる。目標は期間の合計なので、
  // シートのバーと「目標の N」は出さず、期間の進み具合を小見出しに添える
  const periodNote =
    habit && !daily
      ? ` ・ ${PERIOD_LABEL[habit.period]} ${formatQuantity(row?.progress.current ?? 0)}${
          habit.quantityTarget !== null
            ? ` / ${formatQuantity(habit.quantityTarget)}`
            : ""
        } ${unit}`
      : "";
  return (
    <QuantityTotalSheet
      open={row !== null && habit?.inputMode === "total"}
      onClose={onClose}
      title={habit?.name ?? ""}
      habitName={habit?.name ?? ""}
      dateLabel={`${jaDate(today)}${daily ? "" : "の分"}${periodNote}`}
      unit={unit}
      target={daily ? (habit?.quantityTarget ?? null) : null}
      initialValue={todayValue}
      onSubmit={(value) => {
        if (row && value !== todayValue) onSetTotal(row, value);
        onClose();
      }}
    />
  );
}
