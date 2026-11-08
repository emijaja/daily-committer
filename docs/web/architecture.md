# 設計（アーキテクチャ）

ステータス: **承認済み**（2026-11-07）

前提：[README.md](README.md)（方針・技術スタック）、[domain-spec.md](domain-spec.md)（データモデル・計算ロジック）。
この文書は「どう作るか」を決める。承認後に [implementation-plan.md](implementation-plan.md) に沿って実装する。

---

## 1. 全体構成

```
┌──────────── ブラウザ（PWA） ────────────┐
│ React（Server Components ＋ Client Components）│
│ Service Worker（静的ファイルのキャッシュ・Push受信）│
└───────────────┬─────────────────┘
                │ RSC / Server Actions / Route Handlers
┌───────────────▼─────────────────┐
│ Next.js（Vercel）                           │
│  app/        画面（ルーティング）            │
│  server/     ユースケース・DBアクセス        │
│  domain/     計算ロジック（純粋関数）        │
└───────────────┬─────────────────┘
                │ Drizzle ORM
        ┌───────▼───────┐
        │ PostgreSQL（Neon）│
        └───────────────┘
```

### 層と依存の向き

| 層 | 置き場所 | 役割 | 依存してよいもの |
|---|---|---|---|
| domain | `src/domain/` | 連続記録・達成判定・草・振り返りの文章・セリフ・日付の計算。**I/O なしの純粋関数** | なし（日付ライブラリだけ） |
| server | `src/server/` | 認証の確認、DB の読み書き（repository）、ユースケース（service）、Server Actions | domain, db |
| db | `src/db/` | Drizzle のスキーマ・マイグレーション・接続 | なし |
| ui | `src/components/` | 見た目の部品（ボタン、行、草、シートなど）。**データ取得をしない** | domain の型だけ |
| app | `src/app/` | 画面。server を呼んでデータを取り、ui に渡す | すべて |

- domain を純粋関数にすることで、ユニットテストが書きやすく、サーバーとクライアントの両方で使える（楽観的更新の再計算など）。
- ui の部品はデータを props で受け取るだけにする。こうすると、画面の実装とは独立して並行で作れる（部品のカタログページで確認する）。

## 2. ディレクトリ構成

```
src/
  app/
    (auth)/login/page.tsx              ログイン（B1）
    (onboarding)/onboarding/[step]/    O1〜O5
    (main)/                            下部タブのあるレイアウト
      record/today|week|month/         ①-a/b/c
      review/                          ⑥-a（⑥-b はクライアントのモーダル）
      review/[date]/                   ② 記録の確認・修正
      habits/                          ④
      habits/new/                      ⑤-a
      habits/[id]/                     ③
      habits/[id]/edit/                ⑤-b
      settings/                        ⑦
    api/
      auth/[...all]/route.ts           Better Auth
      export/route.ts                  CSV 書き出し
      cron/reminders/route.ts          定時の Push 送信
    dev/components/page.tsx            部品のカタログ（開発環境のみ）
    manifest.ts                        Web App Manifest
  components/                          ui 層（下の 6章）
  domain/
    date.ts        論理日付（タイムゾーン＋切り替え時刻）、週・月の範囲
    achievement.ts 期間ごとの達成判定・進み具合
    streak.ts      いまの連続・最長連続
    grass.ts       草のレベル
    review.ts      「達成していること」「もう少しで達成」
    grumble.ts     キャラのセリフの選択
    types.ts       Habit, Entry, Settings など
  server/
    auth.ts        Better Auth の設定、requireUser()
    repositories/  habits.ts, entries.ts, settings.ts, push.ts
    services/      record.ts, habits.ts, review.ts, onboarding.ts, account.ts
    actions/       Server Actions（画面から呼ぶ入口。zod で入力を検証）
  db/
    schema.ts, client.ts
  styles/
    tokens.css     tokens.json から生成した CSS 変数
drizzle/           マイグレーションのファイル
tests/e2e/         Playwright
```

## 3. データの流れ

### 読み込み（表示）
- 画面（Server Component）で `requireUser()` → service → repository の順に呼び、domain で計算した結果を ui に渡す。
- 例：①-a は「今日の論理日付」を求め、日次の習慣とその日の記録を取得し、`achievement` で各行の状態と集計を、`grumble` でセリフを計算する。

### 書き込み（記録・編集）
- Server Actions で行う。入力は zod で検証し、`user_id` が一致するかを必ず確認する。
- **□のタップは楽観的更新**（`useOptimistic`）で即座に見た目を変え、裏で Server Action を呼ぶ。失敗したら元に戻してトーストで知らせる。
- 書き込んだあとは `revalidatePath` で関係する画面を更新する。

### 「今日」の決め方
- サーバーで `user_settings.timezone` と `day_start_hour` から論理日付を計算する（`domain/date.ts`）。
- 端末の時計とずれても、記録はサーバーが決めた日付で保存する。

## 4. DB

[domain-spec.md](domain-spec.md) 2章のテーブルを Drizzle で定義する。追加で決めること：

- 主キーは uuid（`gen_random_uuid()`）。
- インデックス：`entries (user_id, date)`、`entries (habit_id, date)`、`habits (user_id, archived_at)`。
- 一意制約：チェックのみ・合計を入力の習慣の「1日1行」は、DB の制約だと習慣の種類で条件が変わるため、**service 層で upsert して保証する**（同時に押されたときに備えて、トランザクション内で行をロックする）。
- 外部キーは `ON DELETE CASCADE`。アカウントを削除したら、そのユーザーのデータをすべて消す。
- 日付は `date` 型で持ち、アプリ内では `'YYYY-MM-DD'` の文字列（`LogicalDate` 型）で扱う。JavaScript の `Date` は使わない（タイムゾーンのずれを防ぐ）。

### 読み込みの量
- 年間の草は「そのユーザーの1年分の記録」をまとめて取得して計算する（習慣10個×365日でも数千行）。集計用のテーブルやキャッシュは MVP では作らない。

## 5. 認証

- Better Auth ＋ Google プロバイダ ＋ Drizzle アダプタ。セッションは DB に保存する。
- `src/proxy.ts`（Next.js 16 で middleware から改名）で、`(main)` と `(onboarding)` のうち O5・O4 に、セッションの cookie がなければログインへ移動させる（楽観的なチェック）。**本当の権限チェックは server 層の `requireUser()` で必ず行う。**
- Cache Components が有効なので、セッションを読む部分は `<Suspense>` の内側に置く（レイアウトの最上位で await しない）。
- 初回ログイン時に `user_settings` を作る（タイムゾーンはブラウザから受け取る）。
- `onboarded_at` が NULL なら `(main)` からオンボーディングへ移動させる。
- 画面の流れ：O1 → O2 → O3 → A1 ログイン → O5（習慣を選ぶ）→ O4（通知）→ ①-a。
  - O1〜O3 は説明だけの静的なページで、ログインなしで見られる（`(onboarding)` の中で O1〜O3 だけを公開する）。
  - O5・O4 はログイン後なので、選んだ習慣と通知の購読情報はその場でサーバーに保存できる。
  - O1 の「アカウントをお持ちの方は ログイン」→ A1 → ログイン後、`onboarded_at` があれば ①-a、なければ O5 へ。

## 6. UI 部品

デザインの規則（[visual-style.md](../design/visual-style.md)）をそのまま部品にする。

| 部品 | 使う画面 |
|---|---|
| `ScreenHeader`（英字の大見出し＋日本語の副題＋右のボタン） | すべて |
| `TabBar`（下部タブ）、`SegmentTabs`（上部タブ） | 全体、①④⑥ |
| `Pill`（黒・白のボタン）、`Tag`、`Marker`（黄色のマーカー） | すべて |
| `HabitRow`（チェック／量／週の曜日／月のバー） | ①②④O2 |
| `CheckBox`、`ProgressBar`、`WeekDots` | ①② |
| `SummaryCard`（大きな数字の集計） | ① |
| `Mascot`（4表情・全身／丸アイコン）、`Speech`（吹き出し） | ①③⑤⑥⑦O/E |
| `GrassHeatmap`（4段階／2値、年間） | ⑥③O3E3 |
| `CalendarModal` | ⑥-b |
| `BottomSheet`、`QuantityTotalSheet`、`QuantityIncrementSheet`、`NumPad` | ⑧ |
| `Toast`（取り消しつき） | ① |
| `StatBox`（数字の箱） | ③⑥ |
| `EmptyState` | E1〜E4 |

- スタイル：**Tailwind CSS v4**（`@theme` に tokens.json の値を入れる）を推奨する。部品が多く、並行して開発する人の間で書き方を揃えやすいため。→ 承認事項
- アイコン・キャラは Figma から SVG で書き出し、React コンポーネントにする。
- 画面の列は `max-width: 430px` で中央に表示する（PC では固定幅、スマホでは幅いっぱい。デザインは 375 幅で、430 幅の機種まで横に広がる）。

## 7. PWA と通知

- Manifest（名前、アイコン、`display: standalone`、テーマカラー）と Service Worker（Serwist）。
- MVP ではオフラインでの記録には対応しない。オフラインのときは「接続してください」と表示する。静的ファイルだけキャッシュする。
- 通知は最終フェーズで作る：購読情報を `push_subscriptions` に保存し、定時の処理（D1 で決める）が `/api/cron/reminders` を呼んで、対象のユーザーに送る。

## 8. テスト

| 種類 | 対象 | ツール |
|---|---|---|
| ユニット | domain のすべて（日付の境界、週の始まり、連続、達成、草、文章）。**カバレッジ 90% 以上** | Vitest |
| 統合 | service ＋ repository（実際の Postgres に対して）。権限チェック、1日1行の保証 | Vitest ＋ Docker の Postgres |
| E2E | 主要な流れ（ログイン済みの状態で記録 → 振り返り → 修正）。Google ログインはテスト用のセッションを直接作って回避する | Playwright |

## 9. 開発環境・運用

- パッケージマネージャ：pnpm。Lint・整形：ESLint ＋ Prettier。
- ローカル：`docker compose` で Postgres を起動する。`.env.local` に Google OAuth のクライアント ID などを書く（コミットしない）。
- 環境：local ／ preview（Vercel のプレビューデプロイ＋Neon のブランチ）／ production。
- CI（GitHub Actions）：型チェック・Lint・ユニットテスト・統合テスト。**GitHub のリモートを用意する必要がある**。

## 10. 承認してほしい事項

1. 層の分け方（domain を純粋関数にし、ui はデータを取得しない）
2. 書き込みは Server Actions ＋ 楽観的更新（REST API は作らない。必要になったら Route Handlers を足す）
3. スタイルは Tailwind CSS v4（D2）
4. MVP ではオフラインでの記録をしない
5. 「1日1行」を DB の制約ではなく service 層で保証する
6. GitHub のリモートを作成する（CI、issue、並行開発のブランチ・PR のため）
