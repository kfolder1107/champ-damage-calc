import type { StatKey } from '@/domain/models/Pokemon'

/**
 * 登場時に自分のランクを上げる特性
 * とくじょう: 戦闘に出たとき とくこう+1
 */
export const ENTRY_RANK_BOOSTS: Readonly<Record<string, Partial<Record<StatKey, number>>>> = {
  'とくじょう': { spa: 1 },
}

const clampRank = (rank: number): number => Math.max(-6, Math.min(6, rank))

/**
 * 特性の切り替わりに合わせて登場時ランク上昇を差分適用する
 * - 旧特性のぶんを取り消し、新特性のぶんを加える（同じ特性なら変化なし）
 * - 差分方式なので、メガ→形態切替のように同じ特性が続けて設定されても二重加算しない
 */
export function applyEntryRankBoost(
  ranks: Record<StatKey, number>,
  prevAbility: string,
  nextAbility: string,
): Record<StatKey, number> {
  if (prevAbility === nextAbility) return ranks

  const next = { ...ranks }
  const removed = ENTRY_RANK_BOOSTS[prevAbility] ?? {}
  const added = ENTRY_RANK_BOOSTS[nextAbility] ?? {}
  for (const stat of Object.keys(removed) as StatKey[]) {
    next[stat] = clampRank(next[stat] - (removed[stat] ?? 0))
  }
  for (const stat of Object.keys(added) as StatKey[]) {
    next[stat] = clampRank(next[stat] + (added[stat] ?? 0))
  }
  return next
}
