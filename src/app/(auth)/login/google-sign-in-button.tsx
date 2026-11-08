"use client";

import { use, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { afterLogin } from "./after-login";

export function GoogleSignInButton({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = use(searchParams);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: afterLogin(next),
      });
      // 成功すると Google の画面へ移るので、ここに来るのは失敗したときだけ
      if (error) throw error;
    } catch (e) {
      console.error("Google ログインを始められませんでした", e);
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={signIn}
        className="rounded-pill h-(--size-button-height) bg-black font-bold text-white disabled:opacity-60"
      >
        Google でログイン
      </button>
      {failed && (
        <p role="alert" className="text-caption text-center">
          ログインを始められませんでした。時間をおいて、もう一度お試しください。
        </p>
      )}
    </div>
  );
}
