import { PillLink } from "@/components/Pill";
import { MascotSpeech } from "@/components/Speech";
import {
  ONBOARDING_STEP,
  OnboardingScreen,
  OnboardingText,
  PageDots,
  SkipLink,
} from "../onboarding-ui";
import { TapSample } from "./tap-sample";

/** O2 記録はタップだけ（Figma 2105:5351）。ログインしていなくても開ける */
export default function TapPage() {
  return (
    <OnboardingScreen
      topRight={<SkipLink />}
      visual={
        <div className="w-full">
          <TapSample />
          <MascotSpeech expression="happy" className="mt-5 pr-1.5">
            {"ほら、かんたん。\nぼくでもできそう。"}
          </MascotSpeech>
        </div>
      }
    >
      <OnboardingText title="Tap." heading="できたら、□をタップするだけ。">
        {
          "量（ページ数・km など）も記録できます。\n毎日・毎週・毎月の習慣に対応。"
        }
      </OnboardingText>
      <PageDots current={ONBOARDING_STEP.o2} />
      <div className="mt-4">
        <PillLink href="/onboarding/grow">つぎへ</PillLink>
      </div>
    </OnboardingScreen>
  );
}
