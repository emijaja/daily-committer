import type { ReactNode } from "react";
import { cx, HIT_AREA } from "./cx";
import { Icon } from "./icons";

export interface SummaryCardProps {
  /** 上の小見出し（例：今日の記録　11月1日（金）） */
  label: ReactNode;
  /** 完了した数 */
  done: number;
  /** 全体の数 */
  total: number;
  /** 数字の右の言葉（既定「完了」） */
  suffix?: string;
  /** 数字の下のタグ（Tag を並べる） */
  tags?: ReactNode;
  /** 一番下のひとこと（例：あと1つで、今日はコンプリート！） */
  message?: ReactNode;
  /** 指定するとひとことを押せる（右に ＞） */
  onMessagePress?: () => void;
  className?: string;
}

/** 大きな数字の集計（①-a/b/c のヘッダー下） */
export function SummaryCard({
  label,
  done,
  total,
  suffix = "完了",
  tags,
  message,
  onMessagePress,
  className,
}: SummaryCardProps) {
  return (
    <section className={className}>
      <p className="text-[12px] leading-[13px] font-bold whitespace-pre">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-latin text-big-number leading-[48px]">
          {done}
          <span className="mx-[0.12em]">/</span>
          {total}
        </span>
        <span className="text-[14px] font-bold">{suffix}</span>
      </p>
      {tags ? <div className="mt-1 flex flex-wrap gap-1.5">{tags}</div> : null}
      {message ? (
        onMessagePress ? (
          <button
            type="button"
            onClick={onMessagePress}
            className={cx(
              "mt-1 flex w-full items-center justify-between py-0.5 text-left text-[12px] font-medium",
              HIT_AREA,
            )}
          >
            <span>{message}</span>
            <Icon name="chevron-right" size={14} />
          </button>
        ) : (
          <p className="mt-1 py-0.5 text-[12px] font-medium">{message}</p>
        )
      ) : null}
    </section>
  );
}
