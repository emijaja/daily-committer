/**
 * 書き込み後に更新する画面。ルートは docs/web/architecture.md 2章のとおり。
 * (main) はルートグループなので URL には出ないが、revalidatePath にはファイルの構成どおりに渡す。
 */
import "server-only";
import { revalidatePath } from "next/cache";

/** 記録が変わると表示が変わる画面 */
const RECORD_PAGES = [
  "/record/today",
  "/record/week",
  "/record/month",
  "/review",
] as const;

/** 動的なルート（該当するすべてのページ） */
const RECORD_DYNAMIC_PAGES = [
  "/(main)/review/[date]",
  "/(main)/habits/[id]",
] as const;

/** 記録を書き込んだあと（①②③⑥） */
export function revalidateRecords(): void {
  for (const path of RECORD_PAGES) revalidatePath(path);
  for (const path of RECORD_DYNAMIC_PAGES) revalidatePath(path, "page");
}

/** 習慣を追加・編集・過去にした・並べ替えたあと（記録の画面にも出るので、それらも更新する） */
export function revalidateHabits(): void {
  revalidateRecords();
  revalidatePath("/habits");
  revalidatePath("/habits/presets");
  revalidatePath("/(main)/habits/[id]/edit", "page");
}

/** 設定を変えたあと。週の始まりや日付の切り替えはすべての画面に効くので、(main) 全体を更新する */
export function revalidateAll(): void {
  revalidatePath("/", "layout");
}
