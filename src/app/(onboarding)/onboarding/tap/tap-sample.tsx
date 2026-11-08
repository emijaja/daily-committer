"use client";

import { useState } from "react";
import { HabitList, HabitRow } from "@/components/HabitRow";

/**
 * O2 の記録の行の見本。次に押す□（早起き）を黄色にする。
 * 押すと見本の中だけでチェックが付く（保存はしない）。
 */
export function TapSample() {
  const [checked, setChecked] = useState(false);
  return (
    <HabitList label="記録の見本" className="w-full">
      <HabitRow
        name="読書"
        caption="6日連続"
        control={{ type: "check", checked: true }}
      />
      <HabitRow
        name="早起き"
        caption={checked ? "1日連続" : "タップで記録"}
        control={{ type: "check", checked, onChange: setChecked }}
        highlight
      />
      <HabitRow
        name="筋トレ"
        caption="あと 10 回で目標"
        amount={{ value: 20, target: 30, unit: "回" }}
        control={{ type: "add", done: false }}
      />
    </HabitList>
  );
}
