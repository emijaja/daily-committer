import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { PillLink } from "@/components/Pill";
import {
  ONBOARDING_STEP,
  OnboardingScreen,
  OnboardingText,
  PageDots,
  SkipLink,
  UNDERLINE_LINK,
} from "./onboarding-ui";

/**
 * O1 ようこそ（Figma 2105:5304）。ログインしていなくても開ける。
 * 「スキップ」と「ログイン」は A1 へ。ログイン済みなら A1 が行き先を決める
 * （オンボーディングを終えていれば ①-a、まだなら O5）。
 */
export default function WelcomePage() {
  return (
    <OnboardingScreen
      topRight={<SkipLink />}
      visual={<Mascot expression="normal" size={300} label="" />}
    >
      <OnboardingText title="Hello," heading="ゆるく、続ける。">
        {
          "Sanpai は、習慣を記録して草を育てるアプリです。\nサボりたい日は、ぼくがぼやきます。"
        }
      </OnboardingText>
      <PageDots current={ONBOARDING_STEP.o1} />
      <div className="mt-4">
        <PillLink href="/onboarding/tap">はじめる</PillLink>
      </div>
      <p className="mt-4 text-center text-[11px] leading-[14px] font-medium text-gray-600">
        アカウントをお持ちの方は{" "}
        <Link href="/login" className={UNDERLINE_LINK}>
          ログイン
        </Link>
      </p>
    </OnboardingScreen>
  );
}
