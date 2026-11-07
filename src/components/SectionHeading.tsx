import type { ReactNode } from "react";
import { cx } from "./cx";
import { Tag } from "./Tag";

export interface SectionHeadingProps {
  /** 黒塗りタグ（DAILY・WEEKLY・MONTHLY など）。省略すると日本語の見出しだけ */
  tag?: string;
  title: ReactNode;
  /** 右の件数（例 2 / 3） */
  count?: ReactNode;
  className?: string;
}

/** セクション見出し：黒塗りタグ＋日本語＋右に件数 */
export function SectionHeading({
  tag,
  title,
  count,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      {tag ? <Tag>{tag}</Tag> : null}
      <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold">{title}</h2>
      {count !== undefined ? (
        <span className="font-latin text-[12px] font-bold text-gray-500">
          {count}
        </span>
      ) : null}
    </div>
  );
}
