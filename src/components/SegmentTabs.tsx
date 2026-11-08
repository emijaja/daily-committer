import Link from "next/link";
import { cx, HIT_AREA } from "./cx";

export interface SegmentTabItem<K extends string = string> {
  key: K;
  label: string;
  /** 文字の右の小さな件数（例 2/3、8） */
  count?: string | number;
  /** 指定するとリンクになる（記録の 今日／今週／今月 など、画面が分かれている場合） */
  href?: string;
}

export interface SegmentTabsProps<K extends string = string> {
  items: readonly SegmentTabItem<K>[];
  value: K;
  /** href のないタブを押したとき */
  onChange?: (key: K) => void;
  /** 読み上げ用のラベル */
  label?: string;
  className?: string;
}

/** 上部タブ：文字＋件数。選択中は太字＋黒の下線 2px */
export function SegmentTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentTabsProps<K>) {
  const isLinks = items.every((i) => i.href);
  return (
    <div
      role={isLinks ? undefined : "tablist"}
      aria-label={label}
      className={cx("flex gap-5", className)}
    >
      {items.map((item) => {
        const selected = item.key === value;
        const inner = (
          <>
            <span className="flex items-baseline gap-[5px] leading-4">
              <span
                className={cx(
                  "text-[13px]",
                  selected ? "font-bold text-black" : "text-gray-500",
                )}
              >
                {item.label}
              </span>
              {item.count !== undefined ? (
                <span
                  className={cx(
                    "font-latin text-[10px] font-bold",
                    selected ? "text-black" : "text-gray-500",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={cx(
                "mt-1.5 block h-0.5 w-full rounded-full",
                selected ? "bg-black" : "bg-transparent",
              )}
            />
          </>
        );
        const cls = cx("flex flex-col items-stretch pt-0", HIT_AREA);
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={cls}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(item.key)}
            className={cls}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
