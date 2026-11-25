import { describe, it, expect } from 'vitest'
import { applyEntryRankBoost } from '@/domain/models/EntryAbility'
import type { StatKey } from '@/domain/models/Pokemon'

const zero = (): Record<StatKey, number> => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })

describe('applyEntryRankBoost（登場時ランク上昇特性）', () => {
  it('とくじょうになるととくこう+1', () => {
    const r = applyEntryRankBoost(zero(), 'しれいとう', 'とくじょう')
    expect(r.spa).toBe(1)
    expect(r.atk).toBe(0)
  })

  it('とくじょうから外れるとくこう-1（メガ解除）', () => {
    const r = applyEntryRankBoost({ ...zero(), spa: 1 }, 'とくじょう', 'しれいとう')
    expect(r.spa).toBe(0)
  })

  it('同じ特性が続けて設定されても二重加算しない（メガ→形態切替）', () => {
    const once = applyEntryRankBoost(zero(), 'なし', 'とくじょう')
    const twice = applyEntryRankBoost(once, 'とくじょう', 'とくじょう')
    expect(twice.spa).toBe(1)
  })

  it('手動で積んだランクに上乗せし、+6で頭打ち', () => {
    expect(applyEntryRankBoost({ ...zero(), spa: 2 }, 'なし', 'とくじょう').spa).toBe(3)
    expect(applyEntryRankBoost({ ...zero(), spa: 6 }, 'なし', 'とくじょう').spa).toBe(6)
  })

  it('関係ない特性同士の切り替えではランクを変えない', () => {
    const base = { ...zero(), atk: 2 }
    expect(applyEntryRankBoost(base, 'いかく', 'すながくれ')).toEqual(base)
  })
})
