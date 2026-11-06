# Confidently — デザインコンテキスト

習慣記録アプリ「Confidently」のデザインに関する決定事項・仕様をまとめたドキュメント群。
実装時はこのフォルダと Figma の最新セクションを正とする。

最終更新: 2026-11-06

## ドキュメント

| ファイル | 内容 |
|---|---|
| [product-and-flow.md](product-and-flow.md) | コンセプト、情報設計、画面一覧、画面遷移、データの考え方 |
| [visual-style.md](visual-style.md) | 採用テイスト（みんなの銀行風）の色・文字・形・コンポーネント規則 |
| [character.md](character.md) | キャラクター（ナマケモノ）の仕様・表情・使い方・セリフ方針 |
| [screens.md](screens.md) | 全画面の構成と文言（Figma のフレームと対応） |
| [figma-map.md](figma-map.md) | Figma ファイル内のセクション・ノードID対応表 |
| [tokens.json](tokens.json) | デザイントークン（色・文字・余白・線・角丸） |

## Figma

- ファイル: <https://www.figma.com/design/JD6zC0dSzEWCJYmMKMNL6z/>（file key `JD6zC0dSzEWCJYmMKMNL6z`）
- **最新（正）**
  - セクション「Minna style / 全画面（ナマケモノ）」 `2098:5142`
  - セクション「Minna style / オンボーディング・空の状態」 `2105:5301`
  - コンポーネントセット `mascot/sloth` `2095:5161`
- それ以外のセクション（v1・v2ワイヤー、テイスト比較、キャラ案）は検討の履歴。

## 未決定・保留事項

- 技術スタック、データの保存先（後で検討）
- デスクトップ版（サンプル扱いで保留）
- キャラのセリフの種類と、時間帯・記録状況ごとの出し分けルール（方針のみ決定。[character.md](character.md)）
- 通知の許可を聞くタイミング（現案はオンボーディング O4）
- キャラの名前
- 「達成していること」の並び順
- 曜日指定・平日のみといった周期の細かい指定が必要か
- 記録画面（①）の「＜」と、② 記録の確認・修正の役割の重なり（②に一本化するか）
