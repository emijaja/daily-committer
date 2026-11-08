import { GrassCard } from "@/components/GrassHeatmap";
import { HeaderIconLink, ScreenHeader } from "@/components/ScreenHeader";
import { MascotSpeech } from "@/components/Speech";
import { StatBox } from "@/components/StatBox";
import { Tag } from "@/components/Tag";
import { splitDate } from "@/domain/date";
import type { HabitDetailView } from "@/server/services/types";
import { PERIOD_LABEL } from "../habit-text";

/**
 * ③ 習慣の詳細の中身（screens.md ③）。
 * 大見出しは習慣の名前（習慣に英語名を持たないため。⑧-a と同じ決め方）。副題は周期と、現在／過去の習慣。
 */
export function HabitDetailScreen({ view }: { view: HabitDetailView }) {
  const { habit } = view;
  const archived = habit.archivedOn !== null;
  const lastGrassDate = view.grass.at(-1)?.date ?? view.today;
  const recordedDays = view.grass.filter((c) => c.level > 0).length;

  return (
    <>
      <ScreenHeader
        title={habit.name}
        subtitle={`${PERIOD_LABEL[habit.period]} ・ ${archived ? "過去の習慣" : "現在の習慣"}`}
        back={{
          label: "Habits",
          href: archived ? "/habits?tab=archived" : "/habits",
        }}
        actions={
          <HeaderIconLink
            icon="pencil"
            label="習慣を編集"
            href={`/habits/${habit.id}/edit`}
          />
        }
      />

      <section className="px-screen-x mt-2" aria-label="いまの連続記録">
        <h2 className="text-[11px] font-bold">いまの連続記録</h2>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-latin text-[52px] leading-[56px] font-black tracking-[-0.02em]">
            {view.currentStreak}
          </span>
          <span className="text-[15px] font-bold">
            {view.streakUnit}
            {archived ? "" : " 連続中"}
          </span>
        </p>
        {view.isPersonalBest ? (
          <div className="mt-2 flex items-center gap-1.5">
            <Tag>BEST</Tag>
            <Tag variant="outline">自己ベスト更新中</Tag>
          </div>
        ) : null}
        {archived ? (
          <p className="mt-1 text-[10px] font-medium text-gray-500">
            過去の習慣にしているので、連続は数えていません
          </p>
        ) : null}
      </section>

      {view.grumble ? (
        <MascotSpeech
          form="icon"
          expression={view.grumble.expression}
          className="px-screen-x mt-4"
        >
          {view.grumble.text}
        </MascotSpeech>
      ) : null}

      <div className="px-screen-x mt-4">
        <GrassCard
          year={splitDate(lastGrassDate)[0]}
          summary={`直近1年 ・ ${habit.name}の記録 ${recordedDays}日`}
          cells={view.grass}
          weekStart={view.weekStart}
          today={view.today}
          legend="binary"
          hint={null}
        />
      </div>

      <div className="px-screen-x mt-4 grid grid-cols-2 gap-2.5">
        {view.stats.map((stat) => (
          <StatBox
            key={stat.label}
            size="md"
            label={stat.label}
            value={stat.value}
            unit={stat.unit}
          />
        ))}
      </div>
    </>
  );
}
