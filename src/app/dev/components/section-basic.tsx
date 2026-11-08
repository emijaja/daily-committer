"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Marker } from "@/components/Marker";
import { Pill, PillLink } from "@/components/Pill";
import {
  HeaderIconButton,
  HeaderIconLink,
  ScreenHeader,
} from "@/components/ScreenHeader";
import { SegmentTabs } from "@/components/SegmentTabs";
import { TabBar } from "@/components/TabBar";
import { Tag } from "@/components/Tag";
import { CatalogSection, Sample } from "./catalog-ui";

type RecordTab = "today" | "week" | "month";

export function BasicSection() {
  const [tab, setTab] = useState<RecordTab>("today");
  const [habitTab, setHabitTab] = useState<"current" | "past">("current");

  return (
    <>
      <CatalogSection id="pill" title="Pill" figma="2098:5145 / 2101:5345">
        <Sample label="primary lg">
          <Pill>習慣を追加する</Pill>
        </Sample>
        <Sample label="secondary lg">
          <Pill variant="secondary">過去の習慣にする</Pill>
        </Sample>
        <Sample label="primary md（中央寄せ・アイコンつき）">
          <div className="flex justify-center">
            <Pill size="md" trailing={<Icon name="chevron-up" size={12} />}>
              まとめて記録する
            </Pill>
          </div>
        </Sample>
        <Sample label="sm（保存）／ secondary md ／ disabled ／ リンク">
          <div className="flex flex-wrap items-center gap-3">
            <Pill size="sm">保存</Pill>
            <Pill size="md" variant="secondary">
              ＋ 週の習慣を追加
            </Pill>
            <Pill size="md" disabled>
              保存
            </Pill>
            <PillLink href="/dev/components" size="md">
              リンク
            </PillLink>
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection id="tag" title="Tag" figma="2098:5178">
        <Sample label="solid ／ outline">
          <div className="flex flex-wrap gap-1.5">
            <Tag>STREAK 6</Tag>
            <Tag variant="outline">読書 6日連続</Tag>
            <Tag>4 WEEKS</Tag>
            <Tag variant="outline">ランニング 週10kmペース</Tag>
            <Tag>DAILY</Tag>
            <Tag>WEEKLY</Tag>
            <Tag>MONTHLY</Tag>
            <Tag>BEST</Tag>
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection id="marker" title="Marker" figma="2099:5855 / 2098:5748">
        <Sample label="短い文 ／ 本文の中">
          <div className="space-y-2 text-[12px]">
            <div>
              <Marker>あと 10 回で目標</Marker>
            </div>
            <p className="text-body">
              <Marker>週次は曜日を、月次は回数をタップして修正します</Marker>
            </p>
          </div>
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="screen-header"
        title="ScreenHeader"
        figma="2098:5145 / 2100:5238 / 2101:5345"
      >
        <Sample label="右にボタン（Today）" bleed>
          <ScreenHeader
            title="Today"
            subtitle="今日の習慣を記録"
            actions={
              <>
                <HeaderIconButton icon="help" label="ヘルプ" />
                <HeaderIconLink icon="settings" label="設定" href="/settings" />
              </>
            }
          />
        </Sample>
        <Sample label="戻るリンク＋右に編集（Reading）" bleed>
          <ScreenHeader
            title="Reading"
            subtitle="読書 ・ 毎日 ・ 現在の習慣"
            back={{ label: "Habits", href: "/habits" }}
            actions={<HeaderIconButton icon="pencil" label="編集" />}
          />
        </Sample>
        <Sample label="上の行にキャンセル／保存（Edit Habit）" bleed>
          <ScreenHeader
            title="Edit Habit"
            subtitle="習慣の編集"
            topBar={{
              left: (
                <button
                  type="button"
                  className="min-h-11 text-[13px] font-bold"
                >
                  キャンセル
                </button>
              ),
              right: <Pill size="sm">保存</Pill>,
            }}
          />
        </Sample>
        <Sample label="副題なし" bleed>
          <ScreenHeader title="Review" />
        </Sample>
      </CatalogSection>

      <CatalogSection
        id="segment-tabs"
        title="SegmentTabs"
        figma="2098:5187 / 2100:5718"
      >
        <Sample label="件数つき（ボタン）">
          <SegmentTabs
            label="記録の期間"
            value={tab}
            onChange={setTab}
            items={[
              { key: "today", label: "今日", count: "2/3" },
              { key: "week", label: "今週", count: "1/2" },
              { key: "month", label: "今月", count: "1/3" },
            ]}
          />
        </Sample>
        <Sample label="件数つき（習慣の一覧）">
          <SegmentTabs
            label="習慣の種類"
            value={habitTab}
            onChange={setHabitTab}
            items={[
              { key: "current", label: "現在の習慣", count: 8 },
              { key: "past", label: "過去の習慣", count: 2 },
            ]}
          />
        </Sample>
        <Sample label="件数なし・リンク">
          <SegmentTabs
            value="all"
            items={[
              { key: "all", label: "すべての習慣", href: "/review" },
              { key: "each", label: "習慣ごと", href: "/review?by=habit" },
            ]}
          />
        </Sample>
      </CatalogSection>

      <CatalogSection id="tab-bar" title="TabBar" figma="2098:5236">
        <Sample label="記録を選択" bleed>
          <TabBar current="record" />
        </Sample>
        <Sample label="振り返りを選択" bleed>
          <TabBar current="review" />
        </Sample>
        <Sample label="習慣を選択" bleed>
          <TabBar current="habits" />
        </Sample>
      </CatalogSection>
    </>
  );
}
