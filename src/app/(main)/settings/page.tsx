import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireUser } from "@/server/auth";
import { getSettings } from "@/server/services/settings";
import packageJson from "../../../../package.json";
import { SettingsScreen } from "./settings-screen";

/**
 * ⑦ 設定（screens.md ⑦）。①-a の歯車から開く（下部タブは「記録」が選択中）。
 * 見出しは先に表示し、セッション・DB を読む部分は Suspense の内側に置く（Cache Components）。
 */
export default function SettingsPage() {
  return (
    <main className="pb-8">
      <ScreenHeader
        title="Settings"
        subtitle="設定"
        back={{ label: "Today", href: "/record/today" }}
      />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  return (
    <SettingsScreen
      settings={settings}
      email={user.email}
      version={packageJson.version}
    />
  );
}

function SettingsSkeleton() {
  return (
    <div className="px-screen-x mt-2 space-y-3" aria-hidden="true">
      <div className="h-11 w-full bg-gray-100" />
      <div className="h-4 w-24 bg-gray-100" />
      <div className="frame h-[85px] bg-white" />
      <div className="h-4 w-24 bg-gray-100" />
      <div className="frame h-[95px] bg-white" />
    </div>
  );
}
