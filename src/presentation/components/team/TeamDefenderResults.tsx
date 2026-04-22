import { useMemo, useState } from 'react'
import { executeDamageCalculation } from '@/application/usecases/CalculateDamageUseCase'
import { calculateStats } from '@/application/usecases/CalculateStatsUseCase'
import { MoveRepository } from '@/data/repositories/MoveRepository'
import { PokemonRepository } from '@/data/repositories/PokemonRepository'
import { getNatureModifier } from '@/domain/constants/natureModifiers'
import { STAT_KEYS, STAT_LABEL } from '@/domain/models/Pokemon'
import { withStat, getTotalSp, createSpDistribution } from '@/domain/models/StatPoints'
import { SP_MAX_STAT, SP_MAX_TOTAL } from '@/domain/constants/spLimits'
import { useFieldStore } from '@/presentation/store/fieldStore'
import { FieldStateBar } from '@/presentation/components/field/FieldStateBar'
import { TypeBadge } from '@/presentation/components/shared/Badge'
import type { PokemonStore } from '@/presentation/store/pokemonStore'
import type { Team, TeamMember } from '@/data/schemas/teamTypes'
import type { TypeName, BaseStats, StatKey } from '@/domain/models/Pokemon'
import type { KoResult } from '@/domain/models/DamageResult'
import type { NatureModifier } from '@/domain/constants/natureModifiers'
import type { SpDistribution } from '@/domain/models/StatPoints'

function koLabel(koResult: KoResult): string {
  if (koResult.type === 'guaranteed') return `確定${koResult.hits}発`
  if (koResult.type === 'chance') return `乱数${koResult.hits}発(${(koResult.probability * 100).toFixed(0)}%)`
  return '倒せない'
}

function koColor(koResult: KoResult): string {
  if (koResult.type === 'no-ko') return 'text-slate-400 dark:text-slate-600'
  if (koResult.type === 'guaranteed') {
    if (koResult.hits === 1) return 'text-red-500 dark:text-red-400'
    if (koResult.hits === 2) return 'text-orange-500 dark:text-orange-400'
    if (koResult.hits === 3) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }
  return 'text-amber-600 dark:text-amber-400'
}

interface MoveCalcResult {
  moveName: string
  min: number
  max: number
  defMaxHp: number
  pctMin: number
  pctMax: number
  koResult: KoResult
}

/** ランク調整の +/- ボタン */
function RankControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const color = value > 0 ? 'text-blue-500' : value < 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-4">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(-6, value - 1))}
        disabled={value <= -6}
        className="w-5 h-5 flex items-center justify-center rounded text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30"
      >−</button>
      <span className={`w-5 text-center text-xs font-mono font-bold ${color}`}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(6, value + 1))}
        disabled={value >= 6}
        className="w-5 h-5 flex items-center justify-center rounded text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30"
      >＋</button>
    </div>
  )
}

/** チームメンバー1人に対するダメージ計算結果カード */
function MemberResultCard({
  member,
  attacker,
}: {
  member: TeamMember
  attacker: PokemonStore
}) {
  const field = useFieldStore()
  const battleField = {
    weather: field.weather,
    terrain: field.terrain,
    isReflect: field.isReflect,
    isLightScreen: field.isLightScreen,
    isAuroraVeil: field.isAuroraVeil,
    isTrickRoom: field.isTrickRoom,
  }

  const [defRanks, setDefRanks] = useState({ def: 0, spd: 0 })
  const [sp, setSp] = useState<SpDistribution>(() => ({ ...member.sp }))
  const [showSp, setShowSp] = useState(false)

  const record = PokemonRepository.findById(member.pokemonId)
  const megas = record ? PokemonRepository.getMegasByBaseId(member.pokemonId) : []
  const megaRecord = member.isMega && member.megaKey
    ? megas.find(m => m.key === member.megaKey) : null
  const types = (megaRecord?.types ?? record?.types ?? []) as TypeName[]
  const defBaseStats = (megaRecord?.baseStats ?? record?.baseStats) as BaseStats | undefined

  // 性格修正
  const statNatures: Partial<Record<StatKey, number>> = {
    atk: getNatureModifier(member.natureName, 'atk') as NatureModifier,
    def: getNatureModifier(member.natureName, 'def') as NatureModifier,
    spa: getNatureModifier(member.natureName, 'spa') as NatureModifier,
    spd: getNatureModifier(member.natureName, 'spd') as NatureModifier,
    spe: getNatureModifier(member.natureName, 'spe') as NatureModifier,
  }

  // 実数値計算（SP調整を反映）
  const defStats = defBaseStats ? calculateStats({
    baseStats: defBaseStats,
    sp,
    statNatures,
    ranks: {},
  }) : null

  function handleChangeSp(stat: StatKey, raw: number) {
    const val = Math.max(0, Math.min(SP_MAX_STAT, isNaN(raw) ? 0 : raw))
    const next = withStat(sp, stat, val)
    if (getTotalSp(next) > SP_MAX_TOTAL) return
    setSp(next)
  }

  function getStatValue(stat: StatKey): number {
    if (!defBaseStats) return 0
    return calculateStats({ baseStats: defBaseStats, sp, statNatures, ranks: {} })[stat]
  }

  const totalSp = getTotalSp(sp)
  const remainingSp = SP_MAX_TOTAL - totalSp

  const results = useMemo((): MoveCalcResult[] => {
    if (!record) return []
    const defAbility = member.isMega ? (megaRecord?.ability ?? member.abilityName) : member.abilityName
    const defWeight = megaRecord?.weight ?? record.weight
    if (!defBaseStats) return []

    return attacker.moves
      .map(moveName => {
        if (!moveName) return null
        const move = MoveRepository.findByName(moveName)
        if (!move || move.category === '変化') return null
        try {
          const result = executeDamageCalculation({
            attacker: {
              baseStats: attacker.baseStats,
              types: attacker.types,
              sp: attacker.sp,
              statNatures: attacker.statNatures,
              abilityName: attacker.effectiveAbility,
              itemName: attacker.itemName,
              ranks: attacker.ranks,
              status: attacker.status,
              abilityActivated: attacker.abilityActivated,
              supremeOverlordBoost: attacker.supremeOverlordBoost,
              proteanType: attacker.proteanType,
              proteanStab: attacker.proteanStab,
              weight: attacker.weight,
            },
            defender: {
              baseStats: defBaseStats,
              types: (megaRecord?.types ?? record.types) as TypeName[],
              sp,
              statNatures,
              abilityName: defAbility,
              itemName: member.itemName,
              ranks: { def: defRanks.def, spd: defRanks.spd },
              status: null,
              weight: defWeight,
            },
            move,
            field: battleField,
            isCritical: false,
          })
          return {
            moveName,
            min: result.min,
            max: result.max,
            defMaxHp: result.defenderMaxHp,
            pctMin: result.percentMin,
            pctMax: result.percentMax,
            koResult: result.koResult,
          } satisfies MoveCalcResult
        } catch {
          return null
        }
      })
      .filter((r): r is MoveCalcResult => r !== null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    member.pokemonId, member.natureName, member.abilityName,
    member.itemName, member.isMega, member.megaKey,
    attacker.pokemonId, attacker.sp, attacker.statNatures, attacker.effectiveAbility,
    attacker.itemName, attacker.moves, attacker.ranks, attacker.status,
    attacker.abilityActivated, attacker.supremeOverlordBoost,
    attacker.proteanType, attacker.proteanStab,
    field.weather, field.terrain,
    field.isReflect, field.isLightScreen, field.isAuroraVeil,
    defRanks.def, defRanks.spd,
    sp,
  ])

  return (
    <div className="panel space-y-2">
      {/* メンバーヘッダー */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {member.pokemonName}
          {member.isMega && <span className="ml-1 text-xs text-indigo-500 font-bold">Mega</span>}
        </span>
        {types.map(t => <TypeBadge key={t} type={t as TypeName} />)}
        {defStats && (
          <span className="text-xs text-slate-500 dark:text-slate-500 ml-auto font-mono">
            HP {defStats.hp}
          </span>
        )}
      </div>

      {/* B/Dランク調整 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">ランク補正：</span>
        <RankControl
          label="B"
          value={defRanks.def}
          onChange={v => setDefRanks(r => ({ ...r, def: v }))}
        />
        <RankControl
          label="D"
          value={defRanks.spd}
          onChange={v => setDefRanks(r => ({ ...r, spd: v }))}
        />
        {(defRanks.def !== 0 || defRanks.spd !== 0) && (
          <button
            type="button"
            onClick={() => setDefRanks({ def: 0, spd: 0 })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
          >
            リセット
          </button>
        )}
      </div>

      {/* SP調整 */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => setShowSp(v => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <span className={`transition-transform ${showSp ? 'rotate-90' : ''}`}>▶</span>
          SP調整
          <span className={`font-mono ml-1 ${remainingSp < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            ({totalSp}/{SP_MAX_TOTAL})
          </span>
          {(JSON.stringify(sp) !== JSON.stringify(member.sp)) && (
            <span className="text-orange-500 font-bold">✎</span>
          )}
        </button>

        {showSp && (
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {STAT_KEYS.map(stat => {
                const nature = stat !== 'hp' ? getNatureModifier(member.natureName, stat) : 1.0
                const natureColor =
                  nature > 1.0 ? 'text-blue-500' :
                  nature < 1.0 ? 'text-red-500' :
                  'text-slate-600 dark:text-slate-300'
                return (
                  <div key={stat} className="flex items-center gap-1">
                    <span className={`text-xs w-4 text-center font-medium ${natureColor}`}>
                      {STAT_LABEL[stat]}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={SP_MAX_STAT}
                      value={sp[stat]}
                      onChange={e => handleChangeSp(stat, Number(e.target.value))}
                      className="input-base w-12 text-xs text-center px-1"
                    />
                    <span className={`text-xs font-mono w-8 text-right ${natureColor}`}>
                      {getStatValue(stat)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSp(createSpDistribution(member.sp))}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
              >
                元に戻す
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 技ごとのダメージ */}
      {results.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-600">計算できる技がありません</p>
      ) : (
        <div className="space-y-1">
          {results.map(r => (
            <div key={r.moveName} className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 w-24 truncate flex-shrink-0">
                {r.moveName}
              </span>
              {r.min === 0 && r.max === 0 ? (
                <span className="text-slate-400 dark:text-slate-600">効果なし</span>
              ) : (
                <>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {r.pctMin}〜{r.pctMax}%
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-500">
                    ({r.min}〜{r.max})
                  </span>
                  <span className={`ml-auto font-semibold flex-shrink-0 ${koColor(r.koResult)}`}>
                    {koLabel(r.koResult)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface TeamDefenderResultsProps {
  team: Team
  attacker: PokemonStore
  onClose: () => void
}

/** チーム全員に対してダメージ計算結果を表示するパネル */
export function TeamDefenderResults({ team, attacker, onClose }: TeamDefenderResultsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            防御側チーム：{team.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
            {attacker.pokemonName} の攻撃 → チーム全員
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600"
        >
          ✕ 通常計算に戻る
        </button>
      </div>

      {/* 天候・フィールド・壁 */}
      <FieldStateBar />

      {team.members.length === 0 ? (
        <div className="panel text-center py-8">
          <p className="text-sm text-slate-500 dark:text-slate-600">このチームにはメンバーがいません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {team.members.map(member => (
            <MemberResultCard
              key={member.id}
              member={member}
              attacker={attacker}
            />
          ))}
        </div>
      )}
    </div>
  )
}
