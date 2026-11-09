"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { cx } from "@/components/cx";
import { Toggle } from "@/components/forms";
import { Icon } from "@/components/icons";
import { SectionHeading } from "@/components/SectionHeading";
import { MascotSpeech } from "@/components/Speech";
import { Toast } from "@/components/Toast";
import type { Settings, WeekStart } from "@/domain/types";
import { signOutAction, updateSettingsAction } from "@/server/actions/settings";
import { DeleteAccountDialog } from "./delete-account-dialog";

const WEEK_START_LABEL: Record<WeekStart, string> = {
  mon: "月曜日",
  sun: "日曜日",
};

/** 1日の切り替え時刻の選択肢（domain-spec.md：0〜6時） */
const DAY_START_HOURS = [0, 1, 2, 3, 4, 5, 6] as const;

/** 通知まわりなど、まだ作っていない項目の右の表示 */
const NOT_YET = "準備中";

export interface SettingsScreenProps {
  settings: Settings;
  /** ログイン中の Google アカウントのメールアドレス */
  email: string;
  /** アプリのバージョン（package.json） */
  version: string;
}

/** ⑦ 設定。表示とキャラクターの設定は楽観的に更新し、失敗したら元に戻してトーストで知らせる */
export function SettingsScreen({
  settings,
  email,
  version,
}: SettingsScreenProps) {
  const [current, applyPatch] = useOptimistic(
    settings,
    (state: Settings, patch: Partial<Settings>) => ({ ...state, ...patch }),
  );
  const [, startTransition] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const showToast = (message: string) =>
    setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message }));

  function update(patch: Partial<Settings>) {
    startTransition(async () => {
      applyPatch(patch);
      const result = await updateSettingsAction(patch);
      if (!result.ok) showToast(result.error);
    });
  }

  function signOut() {
    startSignOut(async () => {
      const result = await signOutAction();
      // 成功するとログイン画面へ移るので、戻ってくるのは失敗したときだけ
      if (!result.ok) showToast(result.error);
    });
  }

  return (
    <div>
      <MascotSpeech
        form="icon"
        expression="sleepy"
        className="px-screen-x mt-2"
      >
        設定はほどほどにね。ぼくはもう寝る…。
      </MascotSpeech>

      <Section tag="DISPLAY" title="表示">
        <SelectRow
          label="週の始まり"
          value={current.weekStart}
          display={WEEK_START_LABEL[current.weekStart]}
          options={(["mon", "sun"] as const).map((v) => ({
            value: v,
            label: WEEK_START_LABEL[v],
          }))}
          onChange={(v) => update({ weekStart: v as WeekStart })}
        />
        <SelectRow
          label="1日の切り替え"
          note="この時刻より前の記録は、前の日の分になります"
          value={String(current.dayStartHour)}
          display={`${current.dayStartHour}:00`}
          options={DAY_START_HOURS.map((h) => ({
            value: String(h),
            label: `${h}:00`,
          }))}
          onChange={(v) => update({ dayStartHour: Number(v) })}
        />
      </Section>

      <Section tag="CHARACTER" title="キャラクター">
        <Row label="ぼやきを表示" note="記録画面のヘッダー下">
          <Toggle
            label="ぼやきを表示"
            checked={current.grumbleEnabled}
            onChange={(next) => update({ grumbleEnabled: next })}
          />
        </Row>
        {/* 通知はフェーズ4（Web Push）で作る。それまでは見た目だけ置いて押せなくする */}
        <Row label="通知でもぼやく" note={NOT_YET} disabled>
          <Toggle
            label="通知でもぼやく"
            checked={current.grumblePush}
            onChange={() => {}}
            disabled
          />
        </Row>
      </Section>

      <Section tag="NOTICE" title="通知">
        <Row label="毎日のリマインド" disabled>
          <Value>{NOT_YET}</Value>
        </Row>
      </Section>

      <Section tag="DATA" title="データ">
        <li>
          {/* Route Handler が Content-Disposition: attachment で返すので、画面は移らない */}
          <a href="/api/export" download className={rowClass(true)}>
            <RowLabel label="データを書き出す" note="CSV" />
            <Chevron />
          </a>
        </li>
      </Section>

      <Section tag="ACCOUNT" title="アカウント">
        <Row label="Google アカウント" note={email} />
        <li>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className={rowClass(true)}
          >
            <RowLabel label="ログアウト" />
            <Chevron />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={rowClass(true)}
          >
            <RowLabel
              label="アカウントを削除"
              note="すべての習慣と記録を削除します。元に戻せません"
            />
            <Chevron />
          </button>
        </li>
      </Section>

      <Section tag="OTHER" title="その他">
        <Row label="バージョン">
          <span className="font-latin text-[13px] font-bold text-gray-500">
            {version}
          </span>
        </Row>
      </Section>

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onError={showToast}
      />
      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

function Section({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="px-screen-x mt-3">
      <SectionHeading tag={tag} title={title} />
      <ul className="frame mt-3 divide-y-[1.5px] divide-black bg-white">
        {children}
      </ul>
    </section>
  );
}

function rowClass(interactive = false) {
  return cx(
    "flex min-h-[34px] w-full items-center gap-2.5 py-[9px] pr-3 pl-3.5 text-left",
    interactive && "active:bg-gray-100 disabled:opacity-40",
  );
}

/** 押せない行（右に部品だけを置く行）。disabled なら全体を薄くする */
function Row({
  label,
  note,
  disabled,
  children,
}: {
  label: string;
  note?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className={cx(rowClass(), disabled && "text-gray-500")}>
      <RowLabel label={label} note={note} />
      {children}
    </li>
  );
}

function RowLabel({ label, note }: { label: string; note?: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] leading-4 font-bold">{label}</span>
      {note ? (
        <span className="mt-px block truncate text-[9px] leading-3 font-medium text-gray-500">
          {note}
        </span>
      ) : null}
    </span>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] leading-[14px] font-bold text-gray-500">
      {children}
    </span>
  );
}

function Chevron() {
  return <Icon name="chevron-right" size={12} className="shrink-0" />;
}

/**
 * 値を選ぶ行（週の始まり・1日の切り替え）。行の上に透明な <select> を重ね、
 * タップで端末の選択 UI（iPhone ではホイール）を開く。
 */
function SelectRow({
  label,
  note,
  value,
  display,
  options,
  onChange,
}: {
  label: string;
  note?: string;
  value: string;
  display: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <li
      className={cx(
        rowClass(true),
        "relative has-[select:focus-visible]:outline-2 has-[select:focus-visible]:-outline-offset-4 has-[select:focus-visible]:outline-black",
      )}
    >
      <RowLabel label={label} note={note} />
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="font-latin text-[12px] leading-[14px] font-bold text-gray-500">
          {display}
        </span>
        <Chevron />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </li>
  );
}
