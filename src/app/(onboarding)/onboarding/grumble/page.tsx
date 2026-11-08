import { Suspense } from "react";
import { Mascot } from "@/components/Mascot";
import { Speech } from "@/components/Speech";
import {
  ONBOARDING_STEP,
  OnboardingScreen,
  OnboardingText,
  PageDots,
} from "../onboarding-ui";
import { GrumbleActions } from "./grumble-actions";

/**
 * O4 ぼくがぼやきます（Figma 2105:5627）。オンボーディングの最後。スキップなし。
 * どちらのボタンも onboarded_at を記録して ①-a へ（O5 の「自分で作る」から来たときは ⑤-a へ）。
 * ログインが必要（proxy.ts。完了の Server Action でも確かめる）。
 */
export default function GrumblePage({
  searchParams,
}: PageProps<"/onboarding/grumble">) {
  return (
    <OnboardingScreen
      visual={
        <div className="flex flex-col items-center">
          <Speech className="w-[216px]">
            {"早起きはまた明日かぁ…。\nでも読書と筋トレはえらい。"}
          </Speech>
          <Mascot expression="grumpy" size={240} label="" className="-mt-1.5" />
        </div>
      }
    >
      <OnboardingText title="Grumble." heading="ときどき、ぼくがぼやきます。">
        {"時間帯や記録の状況に合わせて、\n記録画面や通知でひとこと。"}
      </OnboardingText>
      <PageDots current={ONBOARDING_STEP.o4} />
      <Suspense>
        <GrumbleActions searchParams={searchParams} />
      </Suspense>
      <p className="mt-4 text-center text-[10px] leading-3 font-medium text-gray-500">
        iPhone は、ホーム画面に追加すると通知を受け取れます
      </p>
    </OnboardingScreen>
  );
}
