import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, HIT_AREA } from "./cx";
import { Icon, type IconName } from "./icons";

export interface ScreenHeaderProps {
  /** 英字の大見出し（例 Today） */
  title: string;
  /** 日本語の副題（例 今日の習慣を記録） */
  subtitle?: ReactNode;
  /** 見出しの上の戻るリンク（例 ＜ Habits） */
  back?: { label: string; href: string };
  /** 見出しの上の行（フォームの「キャンセル」「保存」など）。back より優先 */
  topBar?: { left?: ReactNode; right?: ReactNode };
  /** 見出しの右に置くボタン（HeaderIconButton など） */
  actions?: ReactNode;
  className?: string;
}

/** 画面の見出し：英字の大見出し＋小さな日本語の副題＋右のボタン */
export function ScreenHeader({
  title,
  subtitle,
  back,
  topBar,
  actions,
  className,
}: ScreenHeaderProps) {
  return (
    <header className={cx("px-screen-x pt-2.5 pb-1.5", className)}>
      {topBar ? (
        <div className="mb-1.5 flex min-h-8 items-center justify-between">
          <div>{topBar.left}</div>
          <div>{topBar.right}</div>
        </div>
      ) : back ? (
        <Link
          href={back.href}
          className={cx(
            "font-latin mb-1 -ml-0.5 inline-flex items-center gap-0.5 text-[13px] font-bold",
            HIT_AREA,
          )}
        >
          <Icon name="chevron-left" size={18} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-latin text-display leading-[39px]">{title}</h1>
          {subtitle ? (
            <p className="text-subtitle-ja mt-0.5 leading-3">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex h-[39px] shrink-0 items-center gap-4">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export interface HeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** 読み上げ用のラベル（必須） */
  label: string;
}

/** 見出しの右に置くアイコンのボタン（？・歯車・鉛筆・＋）。タップ領域は 44px */
export function HeaderIconButton({
  icon,
  label,
  className,
  type = "button",
  ...rest
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        "inline-flex size-5 items-center justify-center",
        HIT_AREA,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/** 見出しの右に置くアイコンのリンク */
export function HeaderIconLink({
  icon,
  label,
  href,
  className,
}: {
  icon: IconName;
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "inline-flex size-5 items-center justify-center",
        HIT_AREA,
        className,
      )}
    >
      <Icon name={icon} size={20} />
    </Link>
  );
}
