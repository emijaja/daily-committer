import type { ReactNode } from "react";
import { AddButton, CheckBox } from "./CheckBox";
import { cx } from "./cx";
import { ProgressBar } from "./ProgressBar";
import { WeekDots, type WeekDay } from "./WeekDots";

/** 右端のボタン。check＝□（押すと完了／取り消し）、add＝＋（達成後は黒塗りのチェック） */
export type HabitRowControl =
  | {
      type: "check";
      checked: boolean;
      onChange?: (next: boolean) => void;
    }
  | {
      type: "add";
      done: boolean;
      onPress?: () => void;
      /** 長押しで前回と同じ量を即記録 */
      onLongPress?: () => void;
    };

export interface HabitRowProps {
  name: string;
  /** 名前の下の補足（例：6日連続、あと 10 回で目標、週の目標 10 km ・ あと 3.8 km） */
  caption?: ReactNode;
  /** 右の数字（例：20 / 30 回）。target を省くと「30 回」のように量だけを出す */
  amount?: { value: number | string; target?: number | string; unit: string };
  control: HabitRowControl;
  /** 指定すると名前の下に進み具合バーを出す（0〜1） */
  progress?: number;
  /** 週次の曜日の四角 */
  week?: { days: readonly WeekDay[]; onDayPress?: (index: number) => void };
  /** 「次に押す所」として右のボタンを黄色にする（オンボーディング O2） */
  highlight?: boolean;
  /** 行（名前のあたり）を押したとき。量の入力シートを開くなど */
  onPress?: () => void;
  className?: string;
}

/** 習慣の行（チェック／量／週の曜日／月のバー）。HabitList の中に並べる */
export function HabitRow({
  name,
  caption,
  amount,
  control,
  progress,
  week,
  highlight,
  onPress,
  className,
}: HabitRowProps) {
  const text = (
    <>
      <span className="text-row-title block truncate leading-[17px]">
        {name}
      </span>
      {caption ? (
        <span className="text-caption mt-0.5 block truncate leading-3 text-gray-500">
          {caption}
        </span>
      ) : null}
    </>
  );

  return (
    <li className={cx("px-row-x pt-row-y pb-row-y", className)}>
      <div className="flex items-center gap-3">
        {onPress ? (
          <button
            type="button"
            onClick={onPress}
            // 行の上下の余白までタップ領域を広げる（高さ 44 以上）
            className="relative min-w-0 flex-1 text-left after:absolute after:inset-x-0 after:-inset-y-3 after:content-['']"
          >
            {text}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{text}</div>
        )}
        {amount ? (
          <div className="flex shrink-0 items-baseline gap-[3px] whitespace-nowrap">
            <span className="font-latin text-row-number leading-[22px]">
              {amount.value}
            </span>
            <span className="text-caption text-gray-500">
              {amount.target !== undefined ? `/ ${amount.target} ` : ""}
              {amount.unit}
            </span>
          </div>
        ) : null}
        {control.type === "check" ? (
          <CheckBox
            label={name}
            checked={control.checked}
            onChange={control.onChange}
            highlight={highlight}
          />
        ) : (
          <AddButton
            label={control.done ? `${name}を追加・修正` : `${name}を記録`}
            done={control.done}
            onPress={control.onPress}
            onLongPress={control.onLongPress}
            highlight={highlight}
          />
        )}
      </div>
      {progress !== undefined ? (
        <ProgressBar
          value={progress}
          label={`${name}の進み具合`}
          className="mt-2 w-[calc(100%-2px)]"
        />
      ) : null}
      {week ? (
        <WeekDots
          days={week.days}
          onDayPress={week.onDayPress}
          className="mt-2"
        />
      ) : null}
    </li>
  );
}

/** 習慣の行を入れる黒枠の箱（行の区切りは黒 1px） */
export function HabitList({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cx("frame divide-y divide-black bg-white", className)}
    >
      {children}
    </ul>
  );
}
