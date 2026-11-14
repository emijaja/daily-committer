"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { HABIT_PRESETS, orderPresetSelection } from "@/domain/presets";
import { cx } from "./cx";
import { Icon } from "./icons";

export interface PresetChipItem {
  name: string;
  selected: boolean;
  /** すでに同じ名前の現在の習慣がある（選べない。チェック付きの灰色） */
  registered?: boolean;
}

/** 最後の「＋ 自分で作る」チップ（点線）。リンクかボタン */
export type PresetChipsCustom =
  | { href: string; onPress?: never; label?: string }
  | { onPress: () => void; href?: never; label?: string };

export interface PresetChipsProps {
  items: readonly PresetChipItem[];
  onToggle: (name: string) => void;
  custom?: PresetChipsCustom;
  disabled?: boolean;
  /** 読み上げ用のグループ名（既定：おすすめの習慣） */
  label?: string;
  className?: string;
}

/**
 * おすすめの習慣の選択の状態（O5・/habits/presets で共通）。初期はすべて未選択。
 * registered（同じ名前の現在の習慣）は選べない。selected はおすすめの並び順。
 */
export function usePresetSelection(registered: readonly string[] = []) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const registeredSet = new Set(registered);
  const items: PresetChipItem[] = HABIT_PRESETS.map((name) => ({
    name,
    selected: picked.has(name) && !registeredSet.has(name),
    registered: registeredSet.has(name),
  }));
  const selected = orderPresetSelection(
    items.filter((i) => i.selected).map((i) => i.name),
  );
  const toggle = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  return { items, selected, toggle };
}

const CHIP =
  "rounded-pill inline-flex h-[37px] shrink-0 items-center gap-[5px] border-(length:--stroke-box) px-3.5 text-[13px] leading-4 font-bold whitespace-nowrap select-none transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:pointer-events-none";

/**
 * おすすめの習慣のチップ（O5・/habits/presets）。選ぶと黒塗り＋チェック。
 * 選択の状態は持たない（親が items と onToggle で管理する）。
 */
export function PresetChips({
  items,
  onToggle,
  custom,
  disabled,
  label = "おすすめの習慣",
  className,
}: PresetChipsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("flex flex-wrap gap-x-2 gap-y-2.5", className)}
    >
      {items.map((item) => {
        const on = item.selected || item.registered;
        return (
          <button
            key={item.name}
            type="button"
            aria-pressed={on}
            aria-label={
              item.registered ? `${item.name}（登録済み）` : undefined
            }
            disabled={disabled || item.registered}
            onClick={() => onToggle(item.name)}
            className={cx(
              CHIP,
              item.registered
                ? "border-gray-300 bg-gray-100 text-gray-500"
                : item.selected
                  ? "border-black bg-black text-white"
                  : "border-black bg-white text-black",
            )}
          >
            {on ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}
            {item.name}
          </button>
        );
      })}
      {custom ? <CustomChip custom={custom} disabled={disabled} /> : null}
    </div>
  );
}

function CustomChip({
  custom,
  disabled,
}: {
  custom: PresetChipsCustom;
  disabled?: boolean;
}) {
  const className = cx(
    CHIP,
    "border-dashed border-black bg-white text-black",
    disabled && "pointer-events-none opacity-40",
  );
  const content: ReactNode = (
    <>
      <Icon name="plus" size={12} strokeWidth={2.5} />
      {custom.label ?? "自分で作る"}
    </>
  );
  if (custom.href !== undefined) {
    return (
      <Link href={custom.href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={custom.onPress}
      className={className}
    >
      {content}
    </button>
  );
}
