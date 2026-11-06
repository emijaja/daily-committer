# Confidently

ゆるく、続ける。習慣記録アプリ（PWA）。

- デザインの仕様：[docs/design/](docs/design/README.md)
- Web版の方針・設計・実装計画：[docs/web/](docs/web/README.md)

## 開発環境

必要なもの：Node.js 24、pnpm 11、Docker

```sh
pnpm install
cp .env.example .env.local   # 値を入れる
pnpm db:up                   # Postgres を起動
pnpm dev                     # http://localhost:3000
```

## コマンド

| コマンド                      | 内容                                   |
| ----------------------------- | -------------------------------------- |
| `pnpm dev`                    | 開発サーバー                           |
| `pnpm build`                  | 本番ビルド                             |
| `pnpm lint`                   | ESLint                                 |
| `pnpm typecheck`              | 型チェック（ルートの型を生成してから） |
| `pnpm test`                   | ユニットテスト（Vitest）               |
| `pnpm test:coverage`          | domain のカバレッジ                    |
| `pnpm format`                 | Prettier で整形                        |
| `pnpm db:up` / `pnpm db:down` | ローカルの Postgres の起動・停止       |
