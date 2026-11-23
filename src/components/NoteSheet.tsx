"use client";

import { useId, useState } from "react";
import { noteLength } from "@/domain/note";
import { BottomSheet } from "./BottomSheet";
import { Marker } from "./Marker";
import { Pill } from "./Pill";

export interface NoteSheetProps {
  open: boolean;
  onClose: () => void;
  /** 習慣の名前（例 読書） */
  habitName: string;
  /** 日付の表示（例 11月1日（金）） */
  dateLabel: string;
  /** その日に記録があるか。なければ「未記録」と、記録はつけないことを伝える */
  recorded: boolean;
  /** いまのひとこと。なければ null（左のボタンが「削除」ではなく「やめる」になる） */
  initialBody: string | null;
  /** 「保存する」を押したとき。空にして保存すると消す */
  onSave: (body: string) => void;
  /** 「削除」を押したとき */
  onDelete: () => void;
}

/**
 * ⑩-a/b ひとことシート（□／＋の長押しで開く）。習慣・日ごとに1つ。長さの上限はない。
 * 長押しでは記録の状態は変えない（未記録の日にも書ける）。開くたびに入力はいまのひとことに戻る。
 */
export function NoteSheet({
  open,
  onClose,
  habitName,
  dateLabel,
  recorded,
  initialBody,
  onSave,
  onDelete,
}: NoteSheetProps) {
  const textareaId = useId();
  const [body, setBody] = useState(initialBody ?? "");
  // 開いたときに入力をいまのひとことに戻す（描画中に前回の open と比べる。Effect は使わない）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setBody(initialBody ?? "");
  }
  const length = noteLength(body.trim());

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Note"
      subtitle={[habitName, dateLabel, recorded ? "記録済み" : "未記録"].join(
        " ・ ",
      )}
    >
      {recorded ? null : (
        <p className="mb-3 text-[11px]">
          <Marker>記録はつけずに、ひとことだけ残します</Marker>
        </p>
      )}
      <label htmlFor={textareaId} className="sr-only">
        {habitName}へのひとこと
      </label>
      <textarea
        id={textareaId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={
          recorded
            ? "どうだった？ ひとこと残せます"
            : "やらなかった理由、思ったことなど"
        }
        className="frame-focus block min-h-[120px] w-full resize-none bg-white p-3.5 text-[14px] leading-[1.65] font-medium outline-none placeholder:text-gray-300"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-gray-500">
        <span className="text-[10px] font-medium">
          この日・この習慣に1つ
        </span>
        <span className="text-[11px] font-bold">
          <span className="font-latin">{length}</span>字
        </span>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={initialBody !== null ? onDelete : onClose}
          className="min-h-11 shrink-0 text-[12px] font-bold underline underline-offset-2"
        >
          {initialBody !== null ? "削除" : "やめる"}
        </button>
        <Pill
          block={false}
          className="flex-1"
          onClick={() => onSave(body)}
        >
          保存する
        </Pill>
      </div>
    </BottomSheet>
  );
}
