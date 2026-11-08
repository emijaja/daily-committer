/**
 * おすすめの習慣（O5「最初の習慣を選ぼう」と /habits/presets「おすすめから選ぶ」）。
 * 文言と並びは Figma の O5（2105:5679）のチップに合わせる。
 * 選んだものは「毎日・チェックのみ」で登録する（services/habits.ts の createHabitsFromPresets）。
 */
export const HABIT_PRESETS = [
  "読書",
  "早起き",
  "筋トレ",
  "ランニング",
  "水を飲む",
  "日記",
  "ストレッチ",
  "瞑想",
  "家計簿",
  "英語の勉強",
  "部屋の掃除",
] as const;

export type HabitPreset = (typeof HABIT_PRESETS)[number];

/** 選んだ数の表示（例：3つ）。0 のときは「0」（Figma の O5 参考：0件） */
export function presetCountLabel(count: number): string {
  return count === 0 ? "0" : `${count}つ`;
}

/**
 * 選んだ名前を、おすすめの並び順に並べ替える（登録の順＝④での並び順になる）。
 * おすすめにない名前は捨てる。
 */
export function orderPresetSelection(
  selected: Iterable<string>,
): HabitPreset[] {
  const set = new Set(selected);
  return HABIT_PRESETS.filter((name) => set.has(name));
}
