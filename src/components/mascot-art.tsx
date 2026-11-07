/* Figma の mascot/sloth（2095:5161）の各表情を SVG で書き出し、JSX にしたもの。 */
/* 線を変えるときは Figma を直して書き出し直す（黒は currentColor、白は fill-white に置き換えている）。 */
import type { ReactNode } from "react";
import type { Expression } from "@/domain/types";

/** 元の SVG の大きさ（164×140） */
export const MASCOT_VIEWBOX = { width: 164, height: 140 } as const;

/** どの表情にも共通の線（枝・体・腕） */
export const mascotBody = (
  <>
    <path
      d="M6 23L146 12C149 12 152 15 153 19L8 33L4 28L6 23Z"
      className="fill-white"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M57 24C57 11 44 10 44 21C38 40 28 62 28 88C28 114 48 130 74 130C88 130 98 126 104 120C116 128 146 122 153 98C160 72 148 48 122 46C110 45 102 50 96 49L92 24C92 12 80 11 80 22L78 30L57 32V24Z"
      className="fill-white"
    />
    <path
      d="M57 24C57 11 44 10 44 21C38 40 28 62 28 88C28 114 48 130 74 130C88 130 98 126 104 120C116 128 146 122 153 98C160 72 148 48 122 46C110 45 102 50 96 49L92 24C92 12 80 11 80 22"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M57 24L59 58M80 22L77 60"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M50 11L50.5 17M86 11V17"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M98.8493 93.5903C94.6689 76.8236 109.576 67.8301 119.665 68.6126C128.206 63.1852 145.59 64.1275 149.77 80.8942C153.796 97.04 141.062 106.811 129.574 108.356C118.706 112.385 102.875 109.736 98.8493 93.5903Z"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M98.0766 87.8462C102.738 80.088 110.347 76.2123 115.468 78.2334C120.589 80.2545 121.748 87.5507 117.09 90.0314C111.811 92.6668 108.161 96.5451 104.276 102.131"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M147.756 75.4599C139.998 70.7983 131.46 70.9482 127.887 75.1369C124.315 79.3257 126.716 86.3122 131.994 86.3156C137.892 86.1641 142.936 87.8747 148.988 90.983"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M125.703 92.8308C127.761 92.3178 129.117 90.6507 128.733 89.1074C128.348 87.5641 126.368 86.7289 124.31 87.2419C122.252 87.755 120.896 89.422 121.281 90.9654C121.666 92.5087 123.646 93.3439 125.703 92.8308Z"
      fill="currentColor"
    />
  </>
);

/** 表情ごとの顔と付属（汗・喜びの線・zzz） */
export const mascotFaces: Record<Expression, ReactNode> = {
  normal: (
    <>
      <path
        d="M115.035 87.0816C116.322 86.7609 117.069 85.3194 116.706 83.8618C116.343 82.4042 115.005 81.4825 113.719 81.8032C112.433 82.1238 111.685 83.5654 112.049 85.023C112.412 86.4806 113.749 87.4022 115.035 87.0816Z"
        fill="currentColor"
      />
      <path
        d="M132.423 82.7456C133.709 82.425 134.457 80.9834 134.094 79.5258C133.73 78.0682 132.393 77.1466 131.107 77.4672C129.821 77.7879 129.073 79.2295 129.436 80.6871C129.8 82.1446 131.137 83.0663 132.423 82.7456Z"
        fill="currentColor"
      />
      <path
        d="M122.596 97.5635C125.803 98.9625 128.494 98.2916 130.669 95.5507"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  grumpy: (
    <>
      <path
        d="M112.359 85.6045L116.706 84.5207"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M129.747 81.2695L134.094 80.1857"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M122.207 98.6502C123.398 96.8142 124.951 96.4271 126.864 97.489C128.778 98.5509 130.331 98.1638 131.522 96.3278"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M100 44C102.667 48 102.667 51 100 53C97.3333 51 97.3333 48 100 44Z"
        className="fill-white"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  happy: (
    <>
      <path
        d="M112.203 86.3034C113.188 83.1995 114.844 82.7867 117.171 85.0647"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M129.591 81.9684C130.576 78.8646 132.232 78.4517 134.559 80.7298"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M121.743 96.7871C126.138 101.188 129.243 100.414 131.058 94.4647L121.743 96.7871Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M100 46L96 41M106 42L105 36M94 52L88 50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  sleepy: (
    <>
      <path
        d="M111.816 84.751C114.04 86.6151 115.696 86.2022 116.784 83.5123"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M129.204 80.416C131.427 82.2801 133.083 81.8672 134.172 79.1774"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M127.368 99.5068C128.225 99.293 128.695 98.2161 128.417 97.1015C128.139 95.9869 127.219 95.2566 126.362 95.4703C125.504 95.6841 125.034 96.761 125.312 97.8756C125.59 98.9903 126.511 99.7205 127.368 99.5068Z"
        fill="currentColor"
      />
      <path
        d="M132 40H139L132 48H139M143 32H148L143 38H148"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};
