import { describe, it, expect } from 'vitest'
import { calculateDamage } from '@/domain/calculators/DamageCalculator'
import type { DamageCalcInput } from '@/domain/calculators/DamageCalculator'
import type { ComputedStats, TypeName } from '@/domain/models/Pokemon'
import type { MoveData } from '@/domain/models/Move'
import type { SpecialMoveTag } from '@/domain/models/Move'
import { createDefaultBattleField } from '@/domain/models/BattleField'

function makeStats(hp: number, atk: number, def: number, spa: number, spd: number, spe: number): ComputedStats {
  return { hp, atk, def, spa, spd, spe }
}

function specialMove(
  name: string, type: TypeName, power: number, special: SpecialMoveTag | null,
): MoveData {
  return {
    name, nameEn: name, type, category: '特殊', power, accuracy: 100, pp: 12, priority: 0,
    flags: { contact: false, sound: false, bullet: false, pulse: false, punch: false, bite: false, slice: false },
    special, multiHit: null,
  }
}

const atkStats = makeStats(175, 120, 100, 150, 120, 100)
const defStats = makeStats(175, 100, 100, 100, 100, 100)

// 攻撃側タイプは「みず」固定: エスパー/でんき/くさ/フェアリー/ノーマル いずれにもSTABが乗らず、
// フィールド依存の威力・タイプ変化だけを切り分けて検証できる
function inputWith(move: MoveData, defenderTypes: TypeName[], terrain: DamageCalcInput['field']['terrain']): DamageCalcInput {
  return {
    move,
    attackerStats: atkStats,
    attackerTypes: ['みず'],
    attackerAbility: '',
    attackerItem: null,
    attackerStatus: null,
    attackerRankModifiers: {},
    attackerWeight: 50,
    defenderStats: defStats,
    defenderTypes,
    defenderAbility: '',
    defenderItem: null,
    defenderStatus: null,
    defenderWeight: 50,
    field: { ...createDefaultBattleField(), terrain },
  }
}

describe('ワイドフォース (expanding-force)', () => {
  const move = specialMove('ワイドフォース', 'エスパー', 80, 'expanding-force')

  it('サイコフィールドで威力1.5倍＋フィールド1.3倍が加わり約1.95倍になる', () => {
    const noField = calculateDamage(inputWith(move, ['ノーマル'], null))
    const psychic = calculateDamage(inputWith(move, ['ノーマル'], 'サイコ'))
    expect(psychic.max).toBeGreaterThan(noField.max)
    const ratio = psychic.max / noField.max
    expect(ratio).toBeGreaterThan(1.85)
    expect(ratio).toBeLessThan(2.05)
  })

  it('サイコ以外のフィールドでは威力補正を受けない', () => {
    const noField = calculateDamage(inputWith(move, ['ノーマル'], null))
    const grassy = calculateDamage(inputWith(move, ['ノーマル'], 'グラス'))
    expect(grassy.max).toBe(noField.max)
  })
})

describe('だいちのはどう (terrain-pulse)', () => {
  const move = specialMove('だいちのはどう', 'ノーマル', 50, 'terrain-pulse')

  it('フィールドなしではノーマルタイプ（ゴーストに無効）', () => {
    const r = calculateDamage(inputWith(move, ['ゴースト'], null))
    expect(r.max).toBe(0)
  })

  it('グラスフィールドでくさタイプ化しゴーストにも通る', () => {
    const r = calculateDamage(inputWith(move, ['ゴースト'], 'グラス'))
    expect(r.max).toBeGreaterThan(0)
  })

  it('エレキフィールドででんきタイプ化（ゴーストに通る）', () => {
    const r = calculateDamage(inputWith(move, ['ゴースト'], 'エレキ'))
    expect(r.max).toBeGreaterThan(0)
  })

  it('ミストフィールドでフェアリータイプ化（ドラゴンに2倍）', () => {
    const r = calculateDamage(inputWith(move, ['ドラゴン'], 'ミスト'))
    expect(r.max).toBeGreaterThan(0)
  })

  it('フィールド時は威力が2倍（同タイプ・同条件の威力50技の約2倍）', () => {
    // エレキ下: だいちのはどう→でんき100 vs 参照でんき50。両者ともエレキ1.3倍・STABなしで条件一致
    const ref = specialMove('でんき50', 'でんき', 50, null)
    const pulse = calculateDamage(inputWith(move, ['ノーマル'], 'エレキ'))
    const base = calculateDamage(inputWith(ref, ['ノーマル'], 'エレキ'))
    const ratio = pulse.max / base.max
    expect(ratio).toBeGreaterThan(1.9)
    expect(ratio).toBeLessThan(2.1)
  })
})
