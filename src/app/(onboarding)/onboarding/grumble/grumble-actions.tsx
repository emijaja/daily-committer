"use client";

import { useRouter } from "next/navigation";
import { use, useState, useTransition } from "react";
import { cx, HIT_AREA } from "@/components/cx";
import { Pill } from "@/components/Pill";
import { Toast } from "@/components/Toast";
import { completeOnboardingAction } from "@/server/actions/settings";
import { UNDERLINE_LINK } from "../onboarding-ui";

/**
 * O4 のボタン。どちらもオンボーディングを終えて ①-a へ進む。
 * 「通知をオンにして、はじめる」の Web Push の購読はフェーズ4（4-2）で作る。いまは完了するだけ。
 * ?next=new（O5 の「＋ 自分で作る」から来た）のときは、完了したあと ⑤-a 習慣の追加を開く。
 */
export function GrumbleActions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = use(searchParams);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );
  const destination = next === "new" ? "/habits/new" : "/record/today";

  const finish = () => {
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (!result.ok) {
        setToast((prev) => ({
          key: (prev?.key ?? 0) + 1,
          message: result.error,
        }));
        return;
      }
      router.replace(destination);
    });
  };

  return (
    <>
      <div className="mt-4">
        <Pill disabled={pending} onClick={finish}>
          あとで設定して、はじめる
        </Pill>
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={pending}
          onClick={finish}
          className={cx(
            UNDERLINE_LINK,
            HIT_AREA,
            "text-[12px] disabled:opacity-40",
          )}
        >
          通知をオンにして、はじめる
        </button>
      </div>
      <Toast
        key={toast?.key}
        open={toast !== null}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </>
  );
}
