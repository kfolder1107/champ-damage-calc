import { useState, useEffect } from 'react'
import { useAttackerStore, useDefenderStore } from '@/presentation/store/pokemonStore'
import { useTeamStore } from '@/presentation/store/teamStore'
import { PokemonPanel } from '@/presentation/components/pokemon/PokemonPanel'
import { DamageResultArea } from '@/presentation/components/results/DamageResultArea'
import { TeamPickerModal } from '@/presentation/components/team/TeamPickerModal'
import { TeamDefenderResults } from '@/presentation/components/team/TeamDefenderResults'
import { useDamageCalc } from '@/presentation/hooks/useDamageCalc'
import { getNatureModifier } from '@/domain/constants/natureModifiers'
import type { TeamMember, Team } from '@/data/schemas/teamTypes'
import type { StatKey } from '@/domain/models/Pokemon'
import type { NatureModifier } from '@/domain/constants/natureModifiers'

/** 攻守交代 */
function swapStores() {
  const a = useAttackerStore.getState()
  const d = useDefenderStore.getState()

  const pick = (s: typeof a) => ({
    pokemonId: s.pokemonId,
    pokemonName: s.pokemonName,
    statNatures: s.statNatures,
    sp: s.sp,
    abilityName: s.abilityName,
    itemName: s.itemName,
    isMega: s.isMega,
    canMega: s.canMega,
    ranks: s.ranks,
    status: s.status,
    moves: s.moves,
    baseStats: s.baseStats,
    types: s.types,
    weight: s.weight,
    effectiveAbility: s.effectiveAbility,
  })

  useAttackerStore.setState(pick(d))
  useDefenderStore.setState(pick(a))
}

/** 初期ポケモン設定 */
function initDefaults() {
  const atk = useAttackerStore.getState()
  atk.setPokemon(445)
  useAttackerStore.getState().setSp('atk', 32)
  useAttackerStore.getState().setMove(0, 'げきりん')
  useAttackerStore.getState().setMove(1, 'じしん')
  useAttackerStore.getState().setMove(2, 'いわなだれ')
  useAttackerStore.getState().setMove(3, 'どくづき')

  const def = useDefenderStore.getState()
  def.setPokemon(115)
  useDefenderStore.getState().setMega(true)
  useDefenderStore.getState().setSp('hp',  27)
  useDefenderStore.getState().setSp('def',  1)
  useDefenderStore.getState().setSp('spd',  1)
  useDefenderStore.getState().setMove(0, 'すてみタックル')
  useDefenderStore.getState().setMove(1, 'ねこだまし')
  useDefenderStore.getState().setMove(2, 'じしん')
  useDefenderStore.getState().setMove(3, 'ふいうち')
}

/** チームメンバーをストアに適用する */
function applyMemberToStore(
  member: TeamMember,
  store: ReturnType<typeof useAttackerStore.getState>,
) {
  // ポケモン設定（sp/ranks/status はリセットされる）
  store.reset()
  store.setPokemon(member.pokemonId)

  // メガシンカ
  if (member.isMega) {
    store.setMega(true)
    if (member.megaKey) store.setMegaForm(member.megaKey)
  }

  // SP
  store.setSpFull(member.sp)

  // 性格 → statNatures
  const STAT_KEYS: Exclude<StatKey, 'hp'>[] = ['atk', 'def', 'spa', 'spd', 'spe']
  for (const stat of STAT_KEYS) {
    const val = getNatureModifier(member.natureName, stat) as NatureModifier
    store.setStatNature(stat, val)
  }

  // 特性（メガでなければ適用）
  if (!member.isMega) {
    store.setAbility(member.abilityName)
  }

  // 持ち物
  store.setItem(member.itemName)

  // 技
  ;([0, 1, 2, 3] as const).forEach(slot => {
    store.setMove(slot, member.moves[slot])
  })
}

export function Calculator() {
  const attackerStore = useAttackerStore()
  const defenderStore = useDefenderStore()
  const teams = useTeamStore(s => s.teams)

  // チームピッカー表示状態
  const [showAttackerPicker, setShowAttackerPicker] = useState(false)
  const [showDefenderPicker, setShowDefenderPicker] = useState(false)

  // 防御側チームモード（IDを保持し、storeから常に最新データを取得）
  const [defenderTeamId, setDefenderTeamId] = useState<string | null>(null)
  const defenderTeam = defenderTeamId ? teams.find(t => t.id === defenderTeamId) ?? null : null

  useDamageCalc()

  useEffect(() => {
    initDefaults()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelectAttackerMember(member: TeamMember) {
    applyMemberToStore(member, useAttackerStore.getState())
  }

  function handleSelectDefenderTeam(team: Team) {
    setDefenderTeamId(team.id)
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {/* モバイル: 攻守交代ボタン */}
        <div className="flex justify-center mb-3 lg:hidden">
          <button
            type="button"
            onClick={swapStores}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:bg-slate-400 dark:active:bg-slate-500 text-slate-700 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-600 transition-colors"
          >
            ⇄ 攻守交代
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* 攻撃側 */}
          <div className="space-y-2">
            {/* チームから選択ボタン */}
            {teams.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAttackerPicker(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                👥 チームから攻撃側を選択
              </button>
            )}
            <PokemonPanel store={attackerStore} label="攻撃側" showMoves />
          </div>

          {/* 中央: ダメージ計算結果 or チーム防御結果 */}
          {defenderTeam ? (
            <div className="lg:col-span-2 space-y-3">
              <TeamDefenderResults
                team={defenderTeam}
                attacker={attackerStore}
                onClose={() => setDefenderTeamId(null)}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* デスクトップのみ攻守交代ボタン */}
                <div className="hidden lg:flex justify-center">
                  <button
                    type="button"
                    onClick={swapStores}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-600 transition-colors"
                  >
                    ⇄ 攻守交代
                  </button>
                </div>
                <DamageResultArea />
              </div>

              {/* 防御側 */}
              <div className="space-y-2">
                {teams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDefenderPicker(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-orange-400 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                  >
                    👥 チーム全員に対して防御計算
                  </button>
                )}
                <PokemonPanel store={defenderStore} label="防御側" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 攻撃側チームピッカーモーダル */}
      {showAttackerPicker && (
        <TeamPickerModal
          teams={teams}
          mode="attacker"
          onSelectMember={handleSelectAttackerMember}
          onClose={() => setShowAttackerPicker(false)}
        />
      )}

      {/* 防御側チームピッカーモーダル */}
      {showDefenderPicker && (
        <TeamPickerModal
          teams={teams}
          mode="defender"
          onSelectTeam={handleSelectDefenderTeam}
          onClose={() => setShowDefenderPicker(false)}
        />
      )}
    </>
  )
}
