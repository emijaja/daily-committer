import { Suspense } from "react";
import { GoogleSignInButton } from "./google-sign-in-button";

/** A1 ログイン。見た目はレーン D（D1）で Figma に合わせて作り込む */
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="px-screen-x flex min-h-dvh flex-col justify-center gap-6">
      <div>
        <h1 className="font-latin text-display">Sign in.</h1>
        <p className="text-subtitle-ja">記録を残すために、ログイン。</p>
      </div>
      <Suspense>
        <GoogleSignInButton searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
