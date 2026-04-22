import { useState, useEffect } from 'react'
import { PokemonSearch } from '@/presentation/components/pokemon/PokemonSearch'
import { AbilitySelect } from '@/presentation/components/pokemon/AbilitySelect'
import { ItemSelect } from '@/presentation/components/pokemon/ItemSelect'
import { MegaToggle } from '@/presentation/components/pokemon/MegaToggle'
import { TypeBadge } from '@/presentation/components/shared/Badge'
import { MoveSelect } from '@/presentation/components/moves/MoveSelect'
import { PokemonRepository } from '@/data/repositories/PokemonRepository'
import { NATURE_TABLE, getNatureModifier } from '@/domain/constants/natureModifiers'
import { createSpDistribution, withStat, getTotalSp } from '@/domain/models/StatPoints'
import { calculateHP, calculateNonHP } from '@/domain/calculators/StatCalculator'
import { SP_MAX_STAT, SP_MAX_TOTAL } from '@/domain/constants/spLimits'
import { STAT_LABEL } from '@/domain/models/Pokemon'
import type { TeamMember } from '@/data/schemas/teamTypes'
import type { PokemonRecord, MegaPokemonRecord } from '@/data/schemas/types'
import type { SpDistribution } from '@/domain/models/StatPoints'
import type { StatKey, TypeName, BaseStats } from '@/domain/models/Pokemon'

const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const NATURES = Object.values(NATURE_TABLE)

interface TeamMemberEditorProps {
  initial?: TeamMember
  onSave: (data: Omit<TeamMember, 'id'>) => void
  onCancel: () => void
}

export function TeamMemberEditor({ initial, onSave, onCancel }: TeamMemberEditorProps) {
  const [pokemonId, setPokemonId] = useState<number | null>(initial?.pokemonId ?? null)
  const [pokemonName, setPokemonName] = useState(initial?.pokemonName ?? '')
  const [baseStats, setBaseStats] = useState<BaseStats>({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })
  const [types, setTypes] = useState<TypeName[]>([])
  const [abilities, setAbilities] = useState<string[]>([])
  const [availableMegas, setAvailableMegas] = useState<MegaPokemonRecord[]>([])
  const [canMega, setCanMega] = useState(false)
  const [sp, setSp] = useState<SpDistribution>(initial?.sp ?? createSpDistribution())
  const [natureName, setNatureName] = useState(initial?.natureName ?? 'がんばりや')
  const [abilityName, setAbilityName] = useState(initial?.abilityName ?? 'なし')
  const [itemName, setItemName] = useState<string | null>(initial?.itemName ?? null)
  const [isMega, setIsMega] = useState(initial?.isMega ?? false)
  const [megaKey, setMegaKey] = useState<string | null>(initial?.megaKey ?? null)
  const [moves, setMoves] = useState<[string | null, string | null, string | null, string | null]>(
    initial?.moves ?? [null, null, null, null]
  )

  // 初期値でポケモンの派生データ（種族値・タイプ・特性リスト）を復元
  // ability/sp/natureName は useState 初期値から引き継ぐ（上書きしない）
  useEffect(() => {
    if (!initial?.pokemonId) return
    const record = PokemonRepository.findById(initial.pokemonId)
    if (!record) return
    const megas = PokemonRepository.getMegasByBaseId(initial.pokemonId)
    setCanMega(megas.length > 0)
    setAvailableMegas(megas)
    setAbilities(record.abilities)

    if (initial.isMega && initial.megaKey) {
      const megaRecord = megas.find(m => m.key === initial.megaKey)
      if (megaRecord) {
        setBaseStats(megaRecord.baseStats as BaseStats)
        setTypes(megaRecord.types as TypeName[])
        return
      }
    }
    setBaseStats(record.baseStats as BaseStats)
    setTypes(record.types as TypeName[])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelectPokemon(pokemon: PokemonRecord) {
    setPokemonId(pokemon.id)
    setPokemonName(pokemon.name)
    setSp(createSpDistribution())
    setIsMega(false)
    setMegaKey(null)

    const megas = PokemonRepository.getMegasByBaseId(pokemon.id)
    setCanMega(megas.length > 0)
    setAvailableMegas(megas)
    setBaseStats(pokemon.baseStats as BaseStats)
    setTypes(pokemon.types as TypeName[])
    setAbilities(pokemon.abilities)
    setAbilityName(pokemon.abilities[0] ?? 'なし')
  }

  function handleSetMega(enable: boolean) {
    if (!pokemonId || !canMega) return
    setIsMega(enable)
    if (enable) {
      const mega = megaKey ? availableMegas.find(m => m.key === megaKey) : availableMegas[0]
      if (mega) {
        setMegaKey(mega.key)
        setBaseStats(mega.baseStats as BaseStats)
        setTypes(mega.types as TypeName[])
        setAbilityName(mega.ability)
      }
    } else {
      const record = PokemonRepository.findById(pokemonId)
      if (record) {
        setBaseStats(record.baseStats as BaseStats)
        setTypes(record.types as TypeName[])
        setAbilities(record.abilities)
        setAbilityName(record.abilities[0] ?? 'なし')
        setMegaKey(null)
      }
    }
  }

  function handleSetMegaForm(key: string) {
    const mega = availableMegas.find(m => m.key === key)
    if (!mega) return
    setMegaKey(key)
    setBaseStats(mega.baseStats as BaseStats)
    setTypes(mega.types as TypeName[])
    setAbilityName(mega.ability)
  }

  function handleChangeSp(stat: StatKey, value: number) {
    const clamped = Math.max(0, Math.min(SP_MAX_STAT, value))
    const newSp = withStat(sp, stat, clamped)
    if (getTotalSp(newSp) > SP_MAX_TOTAL) return
    setSp(newSp)
  }

  function handleSetMove(slot: 0 | 1 | 2 | 3, moveName: string | null) {
    const next = [...moves] as typeof moves
    next[slot] = moveName
    setMoves(next)
  }

  const total = getTotalSp(sp)
  const remaining = SP_MAX_TOTAL - total

  function getStatValue(stat: StatKey): number {
    if (stat === 'hp') return calculateHP(baseStats.hp, sp.hp)
    const nature = getNatureModifier(natureName, stat)
    return calculateNonHP(baseStats[stat], sp[stat], nature)
  }

  function handleSave() {
    if (!pokemonId) return
    onSave({ pokemonId, pokemonName, sp, natureName, abilityName, itemName, isMega, megaKey, moves })
  }

  return (
    <div className="space-y-4">
      {/* ポケモン選択 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label">ポケモン</label>
          {pokemonId && (
            <div className="flex items-center gap-1.5">
              {types.map(t => <TypeBadge key={t} type={t as TypeName} />)}
              {canMega && (
                <MegaToggle
                  isMega={isMega}
                  canMega={canMega}
                  availableMegas={availableMegas}
                  megaKey={megaKey}
                  onChange={handleSetMega}
                  onFormChange={handleSetMegaForm}
                />
              )}
            </div>
          )}
        </div>
        <PokemonSearch value={pokemonName} onSelect={handleSelectPokemon} />
      </div>

      {pokemonId && (
        <>
          {/* 性格 */}
          <div>
            <label className="label block mb-1">性格</label>
            <select
              value={natureName}
              onChange={e => setNatureName(e.target.value)}
              className="input-base w-full text-sm"
            >
              {NATURES.map(n => {
                const up = n.up ? `↑${STAT_LABEL[n.up]}` : ''
                const down = n.down ? `↓${STAT_LABEL[n.down]}` : ''
                const mod = up || down ? ` (${[up, down].filter(Boolean).join(' ')})` : ''
                return (
                  <option key={n.name} value={n.name}>{n.name}{mod}</option>
                )
              })}
            </select>
          </div>

          {/* SP配分 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label">能力ポイント (SP)</span>
              <span className={`text-xs font-mono ${remaining < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {total}/{SP_MAX_TOTAL}（残{remaining}）
              </span>
            </div>
            <div className="space-y-1.5">
              {STAT_KEYS.map(stat => {
                const statVal = getStatValue(stat)
                const nature = stat !== 'hp' ? getNatureModifier(natureName, stat) : 1.0
                const natureColor = nature > 1.0 ? 'text-blue-500' : nature < 1.0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
                const max = Math.min(SP_MAX_STAT, sp[stat] + remaining)
                return (
                  <div key={stat} className="flex items-center gap-1.5">
                    <span className="label w-4 text-center flex-shrink-0">{STAT_LABEL[stat]}</span>
                    <input
                      type="range"
                      min={0}
                      max={SP_MAX_STAT}
                      value={sp[stat]}
                      onChange={e => handleChangeSp(stat, Number(e.target.value))}
                      className="flex-1 min-w-0 h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      style={{ '--max': max } as React.CSSProperties}
                    />
                    <input
                      type="number"
                      min={0}
                      max={SP_MAX_STAT}
                      value={sp[stat]}
                      onChange={e => handleChangeSp(stat, Number(e.target.value))}
                      className="input-base w-10 text-center text-xs px-1 flex-shrink-0"
                    />
                    <span className={`text-xs w-9 text-right font-mono flex-shrink-0 ${natureColor}`}>
                      {statVal}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 特性 */}
          {!isMega && (
            <AbilitySelect
              value={abilityName}
              options={abilities}
              isMega={false}
              onChange={setAbilityName}
            />
          )}
          {isMega && (
            <div>
              <label className="label block mb-1">特性</label>
              <div className="input-base text-sm text-slate-400 w-full">
                {abilityName} <span className="text-xs">(メガ固定)</span>
              </div>
            </div>
          )}

          {/* 持ち物 */}
          <ItemSelect value={itemName} onChange={setItemName} />

          {/* 技 */}
          <div className="space-y-1.5">
            <span className="label">技（最大4つ）</span>
            <div className="grid grid-cols-2 gap-1.5">
              {([0, 1, 2, 3] as const).map(slot => (
                <div key={slot} className="relative">
                  <MoveSelect
                    value={moves[slot]}
                    onChange={name => handleSetMove(slot, name)}
                    placeholder={`技${slot + 1}`}
                  />
                  {moves[slot] && (
                    <button
                      type="button"
                      onClick={() => handleSetMove(slot, null)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 保存 / キャンセル */}
      <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={!pokemonId}
          className="flex-1 btn-primary text-sm py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? '更新' : '追加'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-ghost text-sm py-1.5"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
