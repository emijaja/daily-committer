"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { cx, HIT_AREA } from "@/components/cx";
import {
  GoalBlock,
  PeriodSelect,
  RecordTypeSelect,
  TextField,
} from "@/components/forms";
import { Pill } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MascotSpeech } from "@/components/Speech";
import { Toast } from "@/components/Toast";
import type { Habit } from "@/domain/types";
import {
  archiveHabitAction,
  createHabitAction,
  restoreHabitAction,
  updateHabitAction,
} from "@/server/actions/habits";
import {
  changePeriod,
  initialFormState,
  validateHabitForm,
  type HabitFormErrors,
  type HabitFormState,
} from "./habit-form-state";

export type HabitFormProps =
  | { mode: "new" }
  | {
      mode: "edit";
      habit: Habit;
    };

/** 目標ブロックの中の項目（エラーはブロックの下にまとめて出す） */
const GOAL_FIELDS = [
  "timesPerPeriod",
  "unit",
  "quantityTarget",
  "inputMode",
] as const;

/**
 * ⑤-a 習慣の追加／⑤-b 習慣の編集のフォーム（screens.md ⑤）。
 * 並びは 名前 → 補足 → 周期 → 記録方式 → 目標。目標の中身は記録方式と周期で切り替わる（GoalBlock）。
 * 入力は保存のときに server/validation の habitInputSchema で検証し、サーバーでも同じスキーマで検証する。
 */
export function HabitForm(props: HabitFormProps) {
  const router = useRouter();
  const formId = useId();
  const habit = props.mode === "edit" ? props.habit : undefined;
  const [state, setState] = useState<HabitFormState>(() =>
    initialFormState(habit),
  );
  const [errors, setErrors] = useState<HabitFormErrors>({});
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const cancelHref = habit ? `/habits/${habit.id}` : "/habits";

  const update = <K extends keyof HabitFormState>(
    key: K,
    value: HabitFormState[K],
  ) => {
    setState((s) => ({ ...s, [key]: value }));
    // 直した項目のエラーは消す（目標ブロックは中身が連動するのでまとめて消す）
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      if (
        key === "recordType" ||
        (GOAL_FIELDS as readonly string[]).includes(key)
      ) {
        for (const f of GOAL_FIELDS) delete next[f];
      }
      return next;
    });
  };

  const submit = () => {
    const result = validateHabitForm(state);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const saved = habit
        ? await updateHabitAction({ habitId: habit.id, habit: result.input })
        : await createHabitAction(result.input);
      if (!saved.ok) {
        setToast({ key: Date.now(), message: saved.error });
        return;
      }
      router.push(habit ? `/habits/${habit.id}` : "/habits");
    });
  };

  const toggleArchive = () => {
    if (!habit) return;
    startTransition(async () => {
      const result = habit.archivedOn
        ? await restoreHabitAction({ habitId: habit.id })
        : await archiveHabitAction({ habitId: habit.id });
      if (!result.ok) {
        setToast({ key: Date.now(), message: result.error });
        return;
      }
      router.push(habit.archivedOn ? "/habits" : "/habits?tab=archived");
    });
  };

  const goalErrors = GOAL_FIELDS.map((f) => errors[f]).filter(
    (m): m is string => Boolean(m),
  );

  return (
    <main className="pb-8">
      <ScreenHeader
        title={habit ? "Edit Habit" : "New Habit"}
        subtitle={habit ? "習慣の編集" : "習慣の追加"}
        topBar={{
          left: (
            <Link
              href={cancelHref}
              className={cx("text-[13px] font-bold", HIT_AREA)}
            >
              キャンセル
            </Link>
          ),
          right: (
            <Pill size="sm" type="submit" form={formId} disabled={pending}>
              保存
            </Pill>
          ),
        }}
      />

      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="px-screen-x mt-3 space-y-5"
      >
        <div>
          <TextField
            label="名前"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="例：読書"
            maxLength={50}
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div>
          <TextField
            label="補足（任意）"
            value={state.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="例：寝る前に10ページ"
            maxLength={200}
            aria-invalid={errors.note ? true : undefined}
          />
          <FieldError>{errors.note}</FieldError>
        </div>
        <PeriodSelect
          value={state.period}
          onChange={(period) => {
            setState((s) => changePeriod(s, period));
            setErrors({});
          }}
        />
        <RecordTypeSelect
          value={state.recordType}
          onChange={(recordType) => update("recordType", recordType)}
        />
        <div>
          <GoalBlock
            period={state.period}
            recordType={state.recordType}
            timesPerPeriod={state.timesPerPeriod}
            onTimesPerPeriodChange={(v) => update("timesPerPeriod", v)}
            unit={state.unit}
            onUnitChange={(v) => update("unit", v)}
            quantityTarget={state.quantityTarget}
            onQuantityTargetChange={(v) => update("quantityTarget", v)}
            inputMode={state.inputMode}
            onInputModeChange={(v) => update("inputMode", v)}
          />
          {goalErrors.map((message) => (
            <FieldError key={message}>{message}</FieldError>
          ))}
        </div>

        {habit ? (
          <div className="border-t border-gray-300 pt-5">
            <Pill
              variant="secondary"
              block
              size="lg"
              onClick={toggleArchive}
              disabled={pending}
            >
              {habit.archivedOn ? "現在の習慣に戻す" : "過去の習慣にする"}
            </Pill>
            <p className="mt-2 text-[9px] leading-[14px] font-medium text-gray-500">
              {habit.archivedOn
                ? "戻すと「記録」の画面にまた表示されます"
                : "記録と草は残ります。「習慣 › 過去の習慣」から戻せます"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-6">
            <MascotSpeech expression="normal" form="icon">
              新しい習慣…？ がんばってね。ぼくは見てる。
            </MascotSpeech>
            <Pill type="submit" disabled={pending}>
              習慣を追加する
            </Pill>
          </div>
        )}
      </form>

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </main>
  );
}

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-[11px] leading-4 font-bold">
      ※ {children}
    </p>
  );
}
