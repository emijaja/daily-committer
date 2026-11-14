"use client";

import { useState, useTransition, type ReactNode } from "react";
import { presetCountLabel } from "@/domain/presets";
import { Marker } from "./Marker";
import { usePresetSelection } from "./PresetChips";
import { Toast } from "./Toast";

/** 登録の結果（Server Action の ActionResult と同じ形） */
type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * おすすめの選択と登録（O5・/habits/presets で共通）。
 * submit(save, onDone) で選んだ名前を save に渡し、成功したら onDone、失敗したらトーストで知らせる。
 * 画面には <PresetSubmitToast {...toast} /> を置く。
 */
export function usePresetSubmit(registered: readonly string[] = []) {
  const selection = usePresetSelection(registered);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );

  const submit = (
    save: (names: string[]) => Promise<SaveResult>,
    onDone: () => void,
  ) => {
    const names = selection.selected;
    startTransition(async () => {
      const result = await save(names);
      if (!result.ok) {
        const message = result.error;
        setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message }));
        return;
      }
      onDone();
    });
  };

  return {
    ...selection,
    count: selection.selected.length,
    pending,
    submit,
    toast: { toast, onClose: () => setToast(null) },
  };
}

/** 登録に失敗したときのトースト（usePresetSubmit の toast を渡す） */
export function PresetSubmitToast({
  toast,
  onClose,
}: {
  toast: { key: number; message: string } | null;
  onClose: () => void;
}) {
  return (
    <Toast
      key={toast?.key}
      open={toast !== null}
      message={toast?.message}
      onClose={onClose}
    />
  );
}

/** 「選択中 3つ ・ 〜」のマーカーの一行 */
export function PresetCountNote({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <p className="mt-4 text-[11px] leading-[17px]" aria-live="polite">
      <Marker className="px-1.5">
        選択中 {presetCountLabel(count)} ・ {children}
      </Marker>
    </p>
  );
}
