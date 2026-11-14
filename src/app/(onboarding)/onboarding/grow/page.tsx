import { GRASS_BG } from "@/components/grass-colors";
import { Icon } from "@/components/icons";
import { PillLink } from "@/components/Pill";
import { MascotSpeech } from "@/components/Speech";
import { Tag } from "@/components/Tag";
import type { GrassLevel } from "@/domain/grass";
import {
  ONBOARDING_STEP,
  OnboardingScreen,
  OnboardingText,
  PageDots,
  SkipLink,
} from "../onboarding-ui";

const COLUMNS = 20;
const ROWS = 7;

/**
 * 見本の草（20週 × 7日）。毎回同じ見た目になるよう、決まった式で濃さを決める。
 * 右（最近）ほど濃くして「続けている」感じを出す。
 */
const SAMPLE_GRASS: GrassLevel[] = Array.from(
  { length: COLUMNS * ROWS },
  (_, i) => {
    const column = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const noise = (column * 7 + row * 13 + ((column * row) % 5)) % 10;
    const bias = column / COLUMNS;
    const value = noise / 10 + bias * 0.6;
    if (value > 1.05) return 3;
    if (value > 0.75) return 2;
    if (value > 0.45) return 1;
    return 0;
  },
);

/** O3 草が生える（Figma 2105:5425）。「つぎへ」は A1 へ。ログインしていなくても開ける */
export default function GrowPage() {
  return (
    <OnboardingScreen
      topRight={<SkipLink />}
      visual={
        <div className="w-full">
          <section className="frame bg-white px-[13.5px] pt-[13.5px] pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-latin text-[20px] leading-6 font-black tracking-[-0.02em]">
                Oct
              </h2>
              <Tag>27 DAYS</Tag>
            </div>
            <div
              aria-hidden="true"
              className="mt-3 grid gap-[1.5px]"
              style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
            >
              {SAMPLE_GRASS.map((level, i) => (
                <span key={i} className={`aspect-square ${GRASS_BG[level]}`} />
              ))}
            </div>
            <p className="mt-3.5 flex items-center gap-2 text-[11px] font-bold">
              <span className="frame bg-yellow inline-flex size-[22px] items-center justify-center rounded-full">
                <Icon name="check" size={12} strokeWidth={2.5} />
              </span>
              読書を 27日 連続で続けています
            </p>
          </section>
          <MascotSpeech expression="sleepy" className="mt-5 pr-1.5">
            {"草が伸びるの、\nぼくより速い…。"}
          </MascotSpeech>
        </div>
      }
    >
      <OnboardingText title="Grow." heading="続けた日に、草が生える。">
        {"1年分の草を見返して、\n「続いていること」を言葉で確認できます。"}
      </OnboardingText>
      <PageDots current={ONBOARDING_STEP.o3} />
      <div className="mt-4">
        <PillLink href="/login">つぎへ</PillLink>
      </div>
    </OnboardingScreen>
  );
}
