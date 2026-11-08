import { HabitForm } from "../habit-form";

/** ⑤-a 習慣の追加（screens.md ⑤-a）。ログインの確認は (main) のレイアウトと Server Action で行う */
export default function NewHabitPage() {
  return <HabitForm mode="new" />;
}
