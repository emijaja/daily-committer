import type { SVGProps } from "react";

/**
 * アイコン。Figma（Minna style）から書き出した SVG を currentColor で描く。
 * 色は親の text-* で、大きさは size で決める（線幅は viewBox に対して固定なので、拡大縮小で一緒に変わる）。
 */
export type IconName =
  | "help"
  | "settings"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "plus"
  | "minus"
  | "check"
  | "close"
  | "pencil"
  | "backspace"
  | "target"
  | "tab-record"
  | "tab-review"
  | "tab-habits";

interface IconDef {
  viewBox: number;
  strokeWidth: number;
  d: string;
}

const ICONS: Record<IconName, IconDef> = {
  help: {
    viewBox: 20,
    strokeWidth: 2,
    d: "M7.75 7.75C7.758 7.32 7.882 6.901 8.109 6.536C8.337 6.171 8.659 5.875 9.041 5.679C9.424 5.483 9.852 5.394 10.281 5.422C10.71 5.451 11.123 5.595 11.477 5.84C11.83 6.084 12.11 6.42 12.288 6.812C12.465 7.203 12.533 7.635 12.484 8.062C12.435 8.489 12.271 8.895 12.01 9.236C11.749 9.578 11.4 9.842 11 10C10.375 10.25 10 10.75 10 11.375V11.875M10 14.375H10.013M10 1.875C7.845 1.875 5.778 2.731 4.255 4.255C2.731 5.778 1.875 7.845 1.875 10C1.875 12.155 2.731 14.222 4.255 15.745C5.778 17.269 7.845 18.125 10 18.125C12.155 18.125 14.222 17.269 15.745 15.745C17.269 14.222 18.125 12.155 18.125 10C18.125 7.845 17.269 5.778 15.745 4.255C14.222 2.731 12.155 1.875 10 1.875Z",
  },
  settings: {
    viewBox: 20,
    strokeWidth: 2,
    d: "M10 1.25V3.75M10 16.25V18.75M1.25 10H3.75M16.25 10H18.75M3.75 3.75L5.625 5.625M14.375 14.375L16.25 16.25M3.75 16.25L5.625 14.375M14.375 5.625L16.25 3.75M10 6.875C9.171 6.875 8.376 7.204 7.79 7.79C7.204 8.376 6.875 9.171 6.875 10C6.875 10.829 7.204 11.624 7.79 12.21C8.376 12.796 9.171 13.125 10 13.125C10.829 13.125 11.624 12.796 12.21 12.21C12.796 11.624 13.125 10.829 13.125 10C13.125 9.171 12.796 8.376 12.21 7.79C11.624 7.204 10.829 6.875 10 6.875Z",
  },
  "chevron-left": {
    viewBox: 18,
    strokeWidth: 2.25,
    d: "M11.25 3.375L5.625 9L11.25 14.625",
  },
  "chevron-right": {
    viewBox: 14,
    strokeWidth: 1.575,
    d: "M5.25 2.625L9.625 7L5.25 11.375",
  },
  "chevron-up": { viewBox: 12, strokeWidth: 1.5, d: "M3 7.5L6 4.5L9 7.5" },
  plus: { viewBox: 16, strokeWidth: 2, d: "M8 3V13M3 8H13" },
  minus: { viewBox: 16, strokeWidth: 2, d: "M3 8H13" },
  check: { viewBox: 16, strokeWidth: 2.2, d: "M3 8.5L6 11.5L13 4.5" },
  close: { viewBox: 20, strokeWidth: 2.25, d: "M5 5L15 15M15 5L5 15" },
  pencil: {
    viewBox: 20,
    strokeWidth: 2,
    d: "M13.125 3.125L16.875 6.875L7.5 16.25H3.75V12.5L13.125 3.125Z",
  },
  backspace: {
    viewBox: 18,
    strokeWidth: 1.8,
    d: "M11.25 6.75L7.875 11.25M7.875 6.75L11.25 11.25M5.625 3.375H15.75V14.625H5.625L1.125 9L5.625 3.375Z",
  },
  target: {
    viewBox: 14,
    strokeWidth: 1.4,
    d: "M7 1.75A5.25 5.25 0 1 0 7 12.25A5.25 5.25 0 1 0 7 1.75ZM7 4.8125A2.1875 2.1875 0 1 0 7 9.1875A2.1875 2.1875 0 1 0 7 4.8125Z",
  },
  "tab-record": {
    viewBox: 22,
    strokeWidth: 2.2,
    d: "M6.875 11L9.625 13.75L15.125 8.25M3.4375 3.4375H18.5625V18.5625H3.4375V3.4375Z",
  },
  "tab-review": {
    viewBox: 22,
    strokeWidth: 2.2,
    d: "M2.75 19.25H19.25M5.5 15.125V9.625M11 15.125V4.125M16.5 15.125V8.25",
  },
  "tab-habits": {
    viewBox: 22,
    strokeWidth: 2.2,
    d: "M7.5625 5.5H19.25M7.5625 11H19.25M7.5625 16.5H19.25M2.75 5.5H3.4375M2.75 11H3.4375M2.75 16.5H3.4375",
  },
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** 一辺の px。省略時は Figma の元の大きさ */
  size?: number;
  /** 線幅の上書き（viewBox 基準） */
  strokeWidth?: number;
}

export function Icon({ name, size, strokeWidth, ...rest }: IconProps) {
  const def = ICONS[name];
  const s = size ?? def.viewBox;
  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${def.viewBox} ${def.viewBox}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        d={def.d}
        stroke="currentColor"
        strokeWidth={strokeWidth ?? def.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
