# Confidently — Web版の方針と技術スタック

最終更新: 2026-11-06

## 決定事項

| 項目 | 決定 |
|---|---|
| 公開範囲 | 一般公開（複数ユーザー）。ただし特に告知はしない |
| 形態 | **PWA**（ホーム画面に追加して使う）。PCブラウザでは**スマホ幅（最大 430px）の固定レイアウト**を画面中央に表示する |
| サーバー | 作る。Next.js 一体型（フロントエンドと API を1つのアプリにまとめる） |
| ログイン | **Google ログインのみ**。**ログイン必須**（未ログインでのお試し利用はなし） |
| 進め方 | ①記録 → ④⑤習慣の管理 → ⑥振り返り・草 → ②③ → ⑧ → オンボーディング・空の状態 → ⑦設定・通知 |

## 技術スタック

| 層 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js（App Router）＋ TypeScript | 画面と API（Route Handlers / Server Actions）を同じアプリに置く |
| DB | PostgreSQL（マネージド：Neon など） | |
| ORM | Drizzle ORM | マイグレーションもこれで管理 |
| 認証 | Better Auth（Google プロバイダ、Drizzle アダプタ） | セッションは DB に保存。Auth.js v5 が beta のままのため変更（2026-11-07） |
| スタイル | Tailwind CSS v4 | `docs/design/tokens.json` から @theme を生成（`pnpm tokens`） |
| PWA | Web App Manifest ＋ Service Worker（Serwist などを検討） | |
| 通知 | Web Push（VAPID、`web-push`） | iOS はホーム画面に追加した PWA でのみ受信できる |
| ホスティング | Vercel | |
| テスト | 計算ロジック（連続記録・達成判定・草）はユニットテスト必須 | |

### 注意点

- **定時の通知**：Vercel Cron は Hobby プランだと1日1回までしか動かない。ユーザーごとに指定された時刻（例：21:00）に送るには、Pro プランにするか外部のスケジューラ（Upstash QStash、GitHub Actions など）を使う必要がある。通知は最後の段階で作るので、その時点で決める。
- **O4（通知の許可）**：iOS ではホーム画面に追加する前は通知を許可できない。O4 の画面の流れを Web 向けに調整する必要がある（「あとで設定から」を既定にする、など）。

## 関連ドキュメント

- [domain-spec.md](domain-spec.md) — データモデルと計算ロジックの仕様
- [open-questions.md](open-questions.md) — 検討事項の一覧（再検討・未決定）
- [architecture.md](architecture.md) — 設計（承認済み）
- [implementation-plan.md](implementation-plan.md) — 実装計画（承認済み）
- [../design/README.md](../design/README.md) — デザインの仕様
