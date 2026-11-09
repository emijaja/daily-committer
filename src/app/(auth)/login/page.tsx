import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Mascot } from "@/components/Mascot";
import { Speech } from "@/components/Speech";
import { getCurrentUser } from "@/server/auth";
import { afterLogin } from "./after-login";
import { GoogleSignInButton } from "./google-sign-in-button";

/**
 * A1 ログイン（Figma 2125:5442）。オンボーディングでは O3 のあと（スキップなし・ページ送りの点なし）。
 * ログイン後は ?next の画面へ、なければ入口（/）へ戻り、入口がオンボーディングの状態で行き先を決める
 * （まだなら O5、終えていれば ①-a）。すでにログインしていれば、同じ行き先へすぐ移す。
 */
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh flex-col px-6 pt-2 pb-8">
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={props.searchParams} />
      </Suspense>
      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <Speech className="w-[216px]">
          {"記録、なくしたくないでしょ。\nぼくは毎日なくしてるけど。"}
        </Speech>
        <Mascot expression="normal" size={300} label="" className="mt-2" />
      </div>
      <div>
        <h1 className="font-latin text-[40px] leading-12 font-black tracking-[-0.02em]">
          Sign in.
        </h1>
        <p className="mt-1.5 text-[18px] leading-6 font-bold">
          記録を残すために、ログイン
        </p>
        <p className="text-body mt-1.5 leading-[21px] text-gray-600">
          習慣と記録はアカウントに保存されます。機種変更しても、草はそのまま。
        </p>
      </div>
      <div className="mt-5">
        <Suspense>
          <GoogleSignInButton searchParams={props.searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-[10px] leading-4 font-medium text-gray-600">
        続けると、
        <span className="font-bold text-black underline underline-offset-2">
          利用規約
        </span>{" "}
        と{" "}
        <span className="font-bold text-black underline underline-offset-2">
          プライバシーポリシー
        </span>
        <br />
        に同意したことになります。
      </p>
    </main>
  );
}

async function RedirectIfSignedIn({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const [user, { next }] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect(afterLogin(next));
  return null;
}
