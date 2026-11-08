import { cx } from "./cx";

export interface ProgressBarProps {
  /** 進み具合（0〜1）。1 を超えても満タンで止める */
  value: number;
  /** row: 行の中（高さ 4）／sheet: シートの中（高さ 6） */
  size?: "row" | "sheet";
  /** 読み上げ用のラベル */
  label?: string;
  className?: string;
}

/** 進み具合バー：地 #F2F2F2、黒で塗る */
export function ProgressBar({
  value,
  size = "row",
  label,
  className,
}: ProgressBarProps) {
  const ratio = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const percent = Math.round(ratio * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cx(
        "w-full overflow-hidden bg-gray-100",
        size === "row" ? "h-(--size-progress)" : "h-1.5",
        className,
      )}
    >
      <div
        className="h-full bg-black transition-[width] duration-300"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
