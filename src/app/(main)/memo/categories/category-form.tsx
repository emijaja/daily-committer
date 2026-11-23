"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { cx, HIT_AREA } from "@/components/cx";
import { NumberStepper, SegmentedControl, TextField } from "@/components/forms";
import { Pill } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Toast } from "@/components/Toast";
import {
  MEMO_CATEGORY_NAME_MAX,
  MEMO_DAILY_TARGET_MAX,
  MEMO_PROMPT_MAX,
  promptOf,
  type MemoCategory,
} from "@/domain/memo";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/actions/memo";

type TargetMode = "none" | "daily";

export interface CategoryFormProps {
  /** 編集するカテゴリ。新しく足すときは null */
  category: MemoCategory | null;
  /** キャンセル・保存・削除のあとに戻る先 */
  backHref: string;
}

/**
 * ⑨-c カテゴリの編集・追加（Figma 2167:5592）。
 * 名前・お題（キャラが聞くこと）・1日の目標（なし／あり＋1日に書く数）。
 * 編集ではカテゴリを削除できる（書いたメモはカテゴリなしで残る）。
 */
export function CategoryForm({ category, backHref }: CategoryFormProps) {
  const router = useRouter();
  const formId = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [prompt, setPrompt] = useState(category?.prompt ?? "");
  const [mode, setMode] = useState<TargetMode>(
    category?.dailyTarget ? "daily" : "none",
  );
  const [target, setTarget] = useState(category?.dailyTarget ?? 3);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const fail = (message: string) => setToast({ key: Date.now(), message });

  const save = () => {
    const values = {
      name,
      prompt: prompt.trim() === "" ? null : prompt,
      dailyTarget: mode === "daily" ? target : null,
    };
    startTransition(async () => {
      const result = category
        ? await updateCategoryAction({ categoryId: category.id, ...values })
        : await createCategoryAction(values);
      if (!result.ok) {
        fail(result.error);
        return;
      }
      router.push(backHref);
    });
  };

  const remove = () => {
    if (!category) return;
    startTransition(async () => {
      const result = await deleteCategoryAction({ categoryId: category.id });
      if (!result.ok) {
        fail(result.error);
        return;
      }
      router.push(backHref);
    });
  };

  const closeConfirm = useCallback(() => setConfirming(false), []);

  return (
    <main className="pb-8">
      <ScreenHeader
        title={category ? "Edit Category" : "New Category"}
        subtitle={category ? "カテゴリの編集" : "カテゴリの追加"}
        topBar={{
          left: (
            <Link
              href={backHref}
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
          save();
        }}
        className="px-screen-x mt-3 space-y-5"
      >
        <TextField
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MEMO_CATEGORY_NAME_MAX}
          placeholder="例：感謝"
          required
        />
        <TextField
          label="お題（キャラが聞くこと）"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={MEMO_PROMPT_MAX}
          placeholder={promptOf({ name: name.trim() || "〇〇", prompt: null })}
          note="空なら「今日の（名前）、聞かせて。」と聞きます"
        />
        <div>
          <p className="text-[11px] font-bold">目標</p>
          <SegmentedControl
            label="目標"
            className="mt-2"
            value={mode}
            onChange={setMode}
            options={[
              { value: "none", label: "目標なし" },
              { value: "daily", label: "1日の目標あり" },
            ]}
          />
          {mode === "daily" ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-bold">1日に書く数</span>
                <NumberStepper
                  label="1日に書く数"
                  value={target}
                  onChange={setTarget}
                  min={1}
                  max={MEMO_DAILY_TARGET_MAX}
                  decimals={0}
                  unit="つ"
                />
              </div>
              <p className="mt-2 text-[9px] leading-[14px] font-medium text-gray-500">
                毎日この数を書けたら達成。メモの画面で、連続で達成した日数を表示します
              </p>
            </div>
          ) : null}
        </div>

        {category ? (
          <div className="border-t border-gray-300 pt-5">
            <Pill
              variant="secondary"
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
            >
              このカテゴリを削除
            </Pill>
            <p className="mt-1.5 text-[9px] font-medium text-gray-500">
              書いたメモは消えません
            </p>
          </div>
        ) : null}
      </form>

      <BottomSheet
        open={confirming}
        onClose={closeConfirm}
        title={`「${category?.name ?? ""}」を削除しますか？`}
        subtitle="書いたメモは消えず、カテゴリなしで残ります"
        className="[&_h2]:font-sans [&_h2]:text-[16px] [&_h2]:leading-6"
      >
        <div className="space-y-3">
          <Pill disabled={pending} onClick={remove}>
            削除する
          </Pill>
          <button
            type="button"
            onClick={closeConfirm}
            className="block min-h-11 w-full text-[12px] font-bold"
          >
            やめる
          </button>
        </div>
      </BottomSheet>

      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </main>
  );
}
