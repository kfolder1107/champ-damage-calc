# Pokemon Champions Damage Calculator - アーキテクチャとファイル構成

このファイルは、プロジェクトの主要なファイル構成、各ファイルの役割、および Zustand ストアの設計についてまとめたリファレンスです。
AIエージェントは、既存のコードベースの構造を把握する際や、状態管理（ストア）の仕様を確認する際、またはコンポーネント間の依存関係を調査する際にこのファイルを参照してください。

---

## Zustand ストア

| ストア | 役割 |
|--------|------|
| `useAttackerStore` | 攻撃側ポケモン設定（種族・努力値・性格・技・特性・持ち物・メガ・ランク補正等） |
| `useDefenderStore` | 防御側ポケモン設定（同構造） |
| `useFieldStore` | 天候・フィールド・壁（リフレク・ひかりのかべ・オーロラベール） |
| `useResultStore` | ダメージ計算結果（MoveResult の配列、`result` と `critResult` を持つ） |
| `useAccumStore` | 累積ダメージ（エントリーリスト、使用回数 1–9） |

---

## 重要なファイルと役割

| ファイル | 役割 |
|----------|------|
| `src/domain/calculators/DamageCalculator.ts` | コアダメージ計算（タイプ相性・STAB・特性等） |
| `src/domain/models/Move.ts` | Move 型定義、`selfStatDrop` フィールドを含む |
| `src/data/schemas/types.ts` | JSON スキーマ型定義（MoveRecord に `selfStatDrop` あり） |
| `src/data/json/moves.json` | 技データ（日本語名・英語名・威力・命中・特殊フラグ等） |
| `src/presentation/hooks/useDamageCalc.ts` | 計算実行、`result` と `critResult` を返す |
| `src/presentation/store/resultStore.ts` | `MoveResult` 型（`result`, `critResult` の両方を保持） |
| `src/presentation/store/accumStore.ts` | 累積計算、`setEntryUsages` アクション |
| `src/presentation/components/results/DamageResultArea.tsx` | 結果行 + FieldStateBar + DamageAccumPanel の配置 |
| `src/presentation/components/results/DamageResultRow.tsx` | 急所トグル・自己デバフボタン・加算ボタン |
| `src/presentation/components/results/DamageAccumPanel.tsx` | 累積ダメージ計算・KO 確率表示 |
| `src/infrastructure/version.ts` | `__APP_VERSION__`（Vite が package.json から注入） |
| `src/domain/calculators/SpecialMoveCalc.ts` | 特殊技の威力解決（体重依存・ジャイロボール・ヘビーボンバー等） |
| `src/data/json/pokemon-mega.json` | メガポケモンデータ（`weight` フィールド含む全 74 件） |