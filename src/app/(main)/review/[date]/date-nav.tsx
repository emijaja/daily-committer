import Link from "next/link";
import { cx, HIT_AREA } from "@/components/cx";
import { Icon } from "@/components/icons";
import type { LogicalDate } from "@/domain/types";
import { jaDate } from "../../record/record-format";
import { dateNavLabel } from "./day-edit-format";

export interface DateNavProps {
  date: LogicalDate;
  /** 前の日へのリンク。null なら押せない（習慣を始めた日より前） */
  prevHref: string | null;
  /** 次の日へのリンク。null なら押せない（今日より先） */
  nextHref: string | null;
  /** 日付をタップしたとき（日付を選ぶカレンダーを開く） */
  onPick: () => void;
}

/** ② の日付ナビ（黒枠）：＜ 10.29 火 ＞、下に「2024年 ・ タップで日付を選ぶ」 */
export function DateNav({ date, prevHref, nextHref, onPick }: DateNavProps) {
  const { day, dow, year } = dateNavLabel(date);
  return (
    <nav
      aria-label="日付"
      className="frame mt-3 flex h-[72px] items-center bg-white px-4"
    >
      <Arrow href={prevHref} label="前の日" direction="left" />
      <button
        type="button"
        onClick={onPick}
        aria-label={`${year}${jaDate(date)}・日付を選ぶ`}
        className="flex flex-1 flex-col items-center justify-center self-stretch"
      >
        <span className="flex items-baseline gap-1.5">
          <span className="font-latin text-[24px] leading-7 font-bold">
            {day}
          </span>
          <span className="text-[12px] font-bold">{dow}</span>
        </span>
        <span className="text-caption mt-1 text-gray-500">
          {year} ・ タップで日付を選ぶ
        </span>
      </button>
      <Arrow href={nextHref} label="次の日" direction="right" />
    </nav>
  );
}

function Arrow({
  href,
  label,
  direction,
}: {
  href: string | null;
  label: string;
  direction: "left" | "right";
}) {
  const icon = (
    <Icon
      name={direction === "left" ? "chevron-left" : "chevron-right"}
      size={18}
    />
  );
  const cls = cx("flex size-7 items-center justify-center", HIT_AREA);
  if (href === null) {
    return (
      <span aria-hidden="true" className={cx(cls, "text-gray-300")}>
        {icon}
      </span>
    );
  }
  // 日付を送るたびに履歴が積もらないよう、置き換えで移動する（戻るは ⑥ へ）
  return (
    <Link href={href} aria-label={label} className={cls} replace>
      {icon}
    </Link>
  );
}
