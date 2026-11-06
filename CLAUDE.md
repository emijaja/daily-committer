# daily-committer（習慣記録アプリ「Confidently」）

- デザインの決定事項・仕様は `docs/design/` にある。まず `docs/design/README.md` を読むこと。
- デザインの正は Figma（file key `JD6zC0dSzEWCJYmMKMNL6z`）の「Minna style」セクション。対応表は `docs/design/figma-map.md`。
- Web版の方針・技術スタックは `docs/web/README.md`、データモデルと計算ロジックは `docs/web/domain-spec.md`。
- Next.js は 16 系。学習データと API が異なるので、実装前に `AGENTS.md` の指示どおり `node_modules/next/dist/docs/` を確認すること（例：middleware は `proxy.ts` に改名、Cache Components が有効）。
- コミットの前に `pnpm lint && pnpm typecheck && pnpm test` を通すこと。
