import Link from "next/link";
import { cx } from "@/components/cx";
import { Icon } from "@/components/icons";
import { Marker } from "@/components/Marker";
import { MascotSpeech } from "@/components/Speech";
import { Tag } from "@/components/Tag";
import { dayOfWeek } from "@/domain/date";
import type { MemoCategory, TargetStats } from "@/domain/memo";
import type { MemoHomeView } from "@/server/services/types";
import { draftLabel, jaDate, speechLines, writeHref } from "./memo-format";
import { PastMemo } from "./past-memo";
import { WriteFab } from "./write-fab";

const DOW = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** ⑨ メモ：書く の本体（狛犬のひとこと・過去のメモ・今日のメモ・目標の達成・書くボタン） */
export function MemoHome({ view }: { view: MemoHomeView }) {
  const { speech } = view;
  return (
    <div className="px-screen-x pb-24">
      <MascotSpeech
        character="komainu"
        expression={speech.expression}
        meta={[view.clock, speech.meta].filter(Boolean).join(" ・ ")}
        className="mt-3"
      >
        {speechLines(speech.text)}
      </MascotSpeech>

      {view.draft ? (
        <Link
          href={writeHref({ draft: true })}
          className="frame mt-4 flex min-h-11 items-center gap-2 bg-white px-3.5 py-2 text-[12px] font-bold"
        >
          <Icon name="pencil" size={14} />
          <span className="min-w-0 flex-1 truncate">
            下書き：{draftLabel(view.draft, view.today)}
          </span>
          <span className="text-[11px] underline underline-offset-2">
            続きを書く
          </span>
        </Link>
      ) : null}

      <PastMemo cards={view.pastMemos} className="mt-3.5" />

      <SectionRow
        className="mt-3.5"
        title="今日のメモ"
        sub={jaDate(view.today)}
        link={{ href: "/memo/all", label: "すべてのメモ", chevron: true }}
      />
      <TodayMemos view={view} className="mt-3.5" />

      {view.targets.map((stats) => (
        <div key={stats.categoryId}>
          <SectionRow
            className="mt-3.5"
            title="目標の達成"
            link={{
              href: `/memo/categories/${stats.categoryId}`,
              label: "目標を変える",
            }}
          />
          <TargetCard stats={stats} className="mt-3.5" />
        </div>
      ))}

      <WriteFab href={writeHref({ categoryId: speech.categoryId })} />
    </div>
  );
}

/** 見出しの行：太字の見出し＋小さな補足＋線＋右のリンク */
function SectionRow({
  title,
  sub,
  link,
  className,
}: {
  title: string;
  sub?: string;
  link?: { href: string; label: string; chevron?: boolean };
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <h2 className="text-[11px] font-bold">{title}</h2>
      {sub ? (
        <span className="text-[11px] font-medium text-gray-500">{sub}</span>
      ) : null}
      <span aria-hidden="true" className="h-px flex-1 bg-gray-300" />
      {link ? (
        <Link
          href={link.href}
          className="inline-flex min-h-8 items-center gap-0.5 text-[10px] font-bold underline underline-offset-2"
        >
          {link.label}
          {link.chevron ? <Icon name="chevron-right" size={10} /> : null}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * 今日のメモ：カテゴリごとの件数（目標があれば ■■□ 2/3）と、カテゴリを足す＋。
 * カテゴリが3つまでなら1段（＋を入れて4マス）、4つ以上は3列で折り返し、最後のマスに＋を置く（Figma ⑨ 参考）
 */
function TodayMemos({
  view,
  className,
}: {
  view: MemoHomeView;
  className?: string;
}) {
  const { categories } = view;
  const oneRow = categories.length <= 3;
  return (
    <div
      className={cx("frame grid bg-white", !oneRow && "grid-cols-3", className)}
      style={
        oneRow
          ? {
              gridTemplateColumns: `${categories.map(() => "minmax(0,1fr)").join(" ")} 40px`,
            }
          : undefined
      }
    >
      {categories.map((category, i) => (
        <TodayCell
          key={category.id}
          category={category}
          count={view.todayCounts[category.id] ?? 0}
          className={cx(
            i > 0 && (oneRow || i % 3 !== 0) && "border-l border-black",
            !oneRow && i >= 3 && "border-t border-black",
          )}
        />
      ))}
      <Link
        href="/memo/categories/new"
        aria-label="カテゴリを足す"
        className={cx(
          "flex min-h-[55px] items-center justify-center border-black text-[18px] font-bold",
          (oneRow || categories.length % 3 !== 0) && "border-l",
          !oneRow && categories.length >= 3 && "border-t",
        )}
      >
        ＋
      </Link>
    </div>
  );
}

function TodayCell({
  category,
  count,
  className,
}: {
  category: MemoCategory;
  count: number;
  className?: string;
}) {
  const target = category.dailyTarget;
  return (
    <Link
      href={writeHref({ categoryId: category.id })}
      aria-label={`${category.name}を書く（今日 ${count}${target ? `/${target}` : "件"}）`}
      className={cx(
        "flex min-w-0 flex-col gap-[3px] py-[9px] pr-2 pl-3",
        className,
      )}
    >
      <span className="truncate text-[10px] font-bold">{category.name}</span>
      <span className="flex items-center gap-1.5">
        {target ? (
          <span aria-hidden="true" className="flex gap-0.5">
            {Array.from({ length: Math.min(target, 5) }, (_, i) => (
              <span
                key={i}
                className={cx(
                  "size-[9px]",
                  i < count ? "bg-black" : "border border-black bg-white",
                )}
              />
            ))}
          </span>
        ) : null}
        <span className="font-latin text-[18px] leading-[22px] font-extrabold">
          {count}
        </span>
        <span className="text-[9px] font-medium text-gray-500">
          {target ? `/${target}` : "件"}
        </span>
      </span>
    </Link>
  );
}

/** 目標の達成：連続日数・直近7日・今月の達成・今日の残り */
function TargetCard({
  stats,
  className,
}: {
  stats: TargetStats;
  className?: string;
}) {
  const today = stats.week.at(-1);
  return (
    <section
      aria-label={`${stats.name}の目標の達成`}
      className={cx("frame bg-white px-3 pt-2.5 pb-3", className)}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-bold">{stats.name}</h3>
        <span className="text-[10px] font-medium text-gray-500">
          1日 {stats.target}つ
        </span>
        <span className="flex-1" />
        <Tag variant="outline">最長 {stats.longest}日</Tag>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="font-latin text-[32px] leading-[39px] font-black tracking-[-0.02em]">
          {stats.current}
        </span>
        <span className="text-[11px] font-bold">日 連続で達成</span>
      </p>
      <ol className="mt-2 grid grid-cols-7 gap-1" aria-label="直近7日">
        {stats.week.map((day) => {
          const isToday = day === today;
          return (
            <li key={day.date} className="flex flex-col items-center gap-0.5">
              <span
                className={cx(
                  "font-latin flex h-[22px] w-full items-center justify-center text-[10px] font-bold",
                  day.achieved
                    ? "bg-black text-white"
                    : isToday
                      ? "bg-yellow border-[2.5px] border-black text-[9px] font-extrabold"
                      : "border border-gray-300 bg-white",
                )}
              >
                {day.achieved ? (
                  <span aria-label="達成">✓</span>
                ) : isToday ? (
                  `${day.count}/${stats.target}`
                ) : (
                  <span className="sr-only">{day.count}件</span>
                )}
              </span>
              <span className="text-[9px] font-medium text-gray-500">
                {DOW[dayOfWeek(day.date)]}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-medium text-gray-600">
            今月の達成
          </span>
          <span>
            <span className="font-latin text-[12px] font-extrabold">
              {stats.month.achieved}
            </span>
            <span className="text-[9px] font-medium text-gray-500">
              {" "}
              / {stats.month.days}日
            </span>
          </span>
        </div>
        <div className="mt-[5px] h-1 bg-gray-100">
          <div
            className="h-full bg-black"
            style={{
              width: `${stats.month.days > 0 ? (stats.month.achieved / stats.month.days) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <p className="mt-3 text-[10px] font-bold">
        {stats.remaining > 0 ? (
          <Marker>今日はあと{stats.remaining}つで達成</Marker>
        ) : (
          <Marker>今日は達成！</Marker>
        )}
      </p>
    </section>
  );
}
