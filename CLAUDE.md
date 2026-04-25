# Pokemon Champions Damage Calculator - 開発ルール

## プロジェクト概要
ポケモンチャンピオンズ向けダメージ計算機（React + TypeScript + Vite）。
実戦のシビアな調整に耐えうる計算の正確性とUIの使いやすさを重視。
GitHub Pagesでホスティング、PWA対応。

- リポジトリ: `kfolder1107/champ-damage-calc`
- 本番 URL: `https://kfolder1107.github.io/champ-damage-calc/`
- アーキテクチャ: クリーンアーキテクチャ5層構成（`@/domain`, `@/application`, `@/data`, `@/presentation`, `@/infrastructure`）

## 開発コマンド
- 起動: `npm run dev`
- テスト: `npm run test` (または `npm run test:watch`)
- ビルド: `npm run build`
※ mainマージでGitHub Actionsにより自動デプロイされる

## 行動原則（必ず守ること）
- **作業の明確化**: コードを書き始める前に、必ず今回のタスクのゴールと影響範囲（触るべきディレクトリ層）を宣言・自己レビューすること。
- **型の厳格性**: TypeScriptはstrictモードを前提とし、`any`型による型チェックの回避は絶対に行わないこと。
- **計算の正確性担保**: メガシンカ前後の仕様変更や特性の相互作用など、対戦環境における緻密な計算ロジックを変更する際は、既存の数式を壊さないよう極めて慎重に影響範囲を確認すること。
- **リファレンスの参照**: 過去の実装経緯や仕様変更の意図を知る必要がある場合は `docs/history.md` を、Zustandストアの役割やファイル構成を確認する場合は `docs/store-architecture.md` を適宜読みに行くこと。
- **自律的なストップ**: 実装途中で方向性に迷ったり、予期せぬエラーが連続した場合は、無理にコードを書き進めずに一度立ち止まって状況を報告すること。