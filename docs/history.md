# Pokemon Champions Damage Calculator - 実装履歴と設計の経緯

このファイルには、過去のバージョンアップで実装された機能の経緯や、重要な仕様変更の履歴を記録しています。AIエージェントは過去の実装意図や仕様の背景を確認する必要がある場合のみ、このファイルを参照してください。

---

## V2.1 で実装した主要機能（設計の経緯）

### 1. 加算パネルの統合（単一 "+ 加算" ボタン）

- **変更前**: ダメージ結果行の 1–5 回ボタン ＋ DamageCalcPanel の重複 UI
- **変更後**: 各行に "+ 加算" ボタン1つ、DamageAccumPanel に `[−] ×N [+]` 調整 UI
- `DamageCalcPanel.tsx` は削除し `DamageAccumPanel.tsx` に統合
- 異なる攻撃側/防御側の組み合わせを横断した累積ダメージが可能

### 2. FieldStateBar の位置変更

- 天候/フィールド/壁パネルをページ上部から「結果行 ↓ FieldStateBar ↓ 加算パネル」の間に移動
- `DamageResultArea.tsx` 内で `<FieldStateBar />` を差し込み
- `Calculator.tsx` から `<FieldStateBar />` を削除

### 3. 急所（クリティカルヒット）トグル

- 各ダメージ結果行に「急所」ボタンを追加（黄色）
- `useDamageCalc.ts` で通常ダメージと急所ダメージを両方計算し `critResult` として保持
- 急所時は壁無効・1.5× 補正・ランク補正の扱いが変わる
- 急所モードで "+ 加算" すると急所ダメージが加算される

### 4. 自己デバフ技の簡易ランク低下ボタン

- りゅうせいぐん・オーバーヒート・リーフストームなどで使用後に C ランクを簡単に下げられるボタン
- `moves.json` に `selfStatDrop: { stat: "spa", stages: -2 }` を追加
- `DamageResultRow.tsx` でボタンとして描画、現在ランクが既に -6 の場合は disabled
- **自動適用ではなく手動ボタン**（意図しない変更を防ぐため）

### 5. 体重依存技の修正（けたぐり・くさむすび・ヘビーボンバー）

#### 5-1. 体重境界の比較演算子修正
- `SpecialMoveCalc.ts` の `getWeightPower` で `weight <= maxWeight` → `weight < maxWeight` に変更
- Showdown 準拠の `>= N` 形式と等価に（境界値での判定が正しくなる）
- 例: 100.0kg のポケモンは従来パワー 80 → 正しくはパワー 100
  - フシギバナ(100.0)・メガガルーラ(100.0)・メガラグラージ(102.0) など

#### 5-2. メガシンカ時の体重更新
- `pokemon-mega.json` に全 74 件の `weight` フィールドを追加
- `MegaPokemonRecord` 型にも `weight?: number` を追加（`schemas/types.ts`）
- `pokemonStore.ts` の `setPokemon` / `setMega` / `setMegaForm` でメガ時に体重を切り替え
- 主要な体重変化（パワー帯をまたぐもの）
  - メガガルーラ: 80 → 100（80 → 100）
  - メガガブリアス: 95 → 130（80 → 100）
  - メガヤドラン: 78.5 → 120（80 → 100）
  - メガミュウツーY: 122 → 33（100 → 60、大幅減量）
  - メガヤミラミ: 11 → 161.2（40 → 100、大幅増量）
  - メガピジョット: 39.5 → 50.5（60 → 80）
  - メガラティアス: 40 → 52（60 → 80）

#### 5-3. ヘビーボンバーの正しい実装
- 変更前: `special: "low-kick"`（防御側体重のみ）で誤計算
- 変更後: 新 `heavy-slam` タグを追加し、攻撃側/防御側の体重比で威力決定
  - 比 ≥ 5 → 120 / ≥ 4 → 100 / ≥ 3 → 80 / ≥ 2 → 60 / それ未満 → 40
- `SpecialMoveContext` に `attackerWeight?` を追加、`DamageCalculator.resolvePower` から渡す
- `Move.ts` の `SpecialMoveTag` に `'heavy-slam'` を追加