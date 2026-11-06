"use client";

import { use, useState } from "react";
import { authClient } from "@/lib/auth-client";

/** ログイン後に戻る先。外部への移動を防ぐため、/ で始まる相対パスだけ許す */
function safeNext(next: unknown): string {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? next
    : "/record/today";
}

export function GoogleSignInButton({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = use(searchParams);
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signIn.social({
          provider: "google",
          callbackURL: safeNext(next),
        });
      }}
      className="rounded-pill h-(--size-button-height) bg-black font-bold text-white disabled:opacity-60"
    >
      Google でログイン
    </button>
  );
}
