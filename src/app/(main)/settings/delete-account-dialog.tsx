"use client";

import { useEffect, useId, useRef, useTransition } from "react";
import { Pill } from "@/components/Pill";
import { MascotSpeech } from "@/components/Speech";
import { deleteAccountAction } from "@/server/actions/settings";

/**
 * ⑦-b アカウントを削除（確認ダイアログ）。暗幕＋中央に黒枠の白いボックス（幅 335）。
 * 危険な操作でも色は増やさない（黒白のまま。screens.md ⑦-b）。
 * 削除に成功すると deleteAccountAction がログイン画面へ移す。
 */
export function DeleteAccountDialog({
  open,
  onClose,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  /** 削除に失敗したとき（メッセージを渡す） */
  onError: (message: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  useEffect(() => {
    // 取り返しのつかない操作なので、最初のフォーカスは「キャンセル」に置く
    if (open)
      boxRef.current
        ?.querySelector<HTMLButtonElement>("[data-cancel]")
        ?.focus();
  }, [open]);

  if (!open) return null;

  function confirm() {
    startTransition(async () => {
      const result = await deleteAccountAction();
      // 成功するとログイン画面へ移るので、戻ってくるのは失敗したときだけ
      if (!result.ok) {
        onClose();
        onError(result.error);
      }
    });
  }

  return (
    <div className="bg-scrim px-screen-x fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={pending ? undefined : onClose}
      />
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="frame relative w-full max-w-[335px] bg-white px-5 pt-6 pb-5"
      >
        <h2 id={titleId} className="text-[18px] leading-6 font-bold">
          アカウントを削除しますか？
        </h2>
        <p
          id={descriptionId}
          className="mt-4 text-[11px] leading-5 font-medium text-gray-600"
        >
          習慣・記録・設定がすべて削除され、
          <br />
          元に戻せません。
        </p>
        <MascotSpeech form="icon" expression="sleepy" className="mt-4">
          …ほんとに？ ぼくはさみしい。
        </MascotSpeech>
        <div className="mt-5 flex gap-2.5">
          <Pill
            data-cancel
            variant="secondary"
            className="flex-1 px-0"
            onClick={onClose}
            disabled={pending}
          >
            キャンセル
          </Pill>
          <Pill className="flex-1 px-0" onClick={confirm} disabled={pending}>
            {pending ? "削除しています…" : "削除する"}
          </Pill>
        </div>
      </div>
    </div>
  );
}
