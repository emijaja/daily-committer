import { cx } from "./cx";

export interface WeekDay {
  /** 曜日（月・火…） */
  label: string;
  /** 記録した日 */
  done: boolean;
  /** 未来の日（押せない・灰色） */
  future?: boolean;
  /** 今日（または ② で選んだ日）。黄色＋太枠 2.5px */
  highlight?: boolean;
  /** 読み上げ用の日付（例 10月28日） */
  ariaLabel?: string;
}

export interface WeekDotsProps {
  /** 週の始まりから順に7日 */
  days: readonly WeekDay[];
  /** 指定すると曜日を押せる（② の修正など）。引数は days の添字 */
  onDayPress?: (index: number) => void;
  className?: string;
}

/** 週次の曜日の四角（36×28）。記録した日＝黒塗り白文字、今日＝黄色＋太枠、未来＝灰色 */
export function WeekDots({ days, onDayPress, className }: WeekDotsProps) {
  return (
    <div className={cx("flex gap-1.5", className)}>
      {days.map((day, i) => {
        const cls = cx(
          "flex h-(--size-day-cell-h) w-(--size-day-cell-w) shrink-0 items-center justify-center text-[11px] font-bold",
          // 同じ性質のクラスを重ねないよう、枠と塗りを別々に決める
          day.highlight
            ? "border-(length:--stroke-focus) border-black"
            : day.done
              ? "border-(length:--stroke-box) border-black"
              : day.future
                ? "border border-gray-200"
                : "border border-gray-300",
          day.done
            ? "bg-black text-white"
            : day.highlight
              ? "bg-yellow text-black"
              : day.future
                ? "bg-white text-gray-300"
                : "bg-white text-black",
        );
        const title = day.ariaLabel ?? day.label;
        if (onDayPress) {
          return (
            <button
              key={i}
              type="button"
              aria-pressed={day.done}
              aria-label={title}
              disabled={day.future}
              onClick={() => onDayPress(i)}
              className={cx(
                cls,
                // 36×28 の四角でも 44px 押せるように周りへ広げる
                "relative after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']",
              )}
            >
              {day.label}
            </button>
          );
        }
        return (
          <span
            key={i}
            className={cls}
            role="img"
            aria-label={`${title}：${day.done ? "記録あり" : day.future ? "これから" : "記録なし"}`}
          >
            {day.label}
          </span>
        );
      })}
    </div>
  );
}
