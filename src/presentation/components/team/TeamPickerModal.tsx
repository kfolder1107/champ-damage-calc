import { useState, useEffect, useRef } from 'react'
import { TypeBadge } from '@/presentation/components/shared/Badge'
import { PokemonRepository } from '@/data/repositories/PokemonRepository'
import type { Team, TeamMember } from '@/data/schemas/teamTypes'
import type { TypeName } from '@/domain/models/Pokemon'

interface TeamPickerModalProps {
  teams: Team[]
  /** 'attacker': メンバーを1匹選択して攻撃側に適用 */
  mode: 'attacker' | 'defender'
  onSelectMember?: (member: TeamMember) => void   // mode === 'attacker'
  onSelectTeam?: (team: Team) => void             // mode === 'defender'
  onClose: () => void
}

export function TeamPickerModal({
  teams,
  mode,
  onSelectMember,
  onSelectTeam,
  onClose,
}: TeamPickerModalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams[0]?.id ?? null)
  const [isListHovered, setIsListHovered] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null

  // オーバーレイクリックで閉じる
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSelectMember(member: TeamMember) {
    onSelectMember?.(member)
    onClose()
  }

  function handleSelectTeam() {
    if (!selectedTeam) return
    onSelectTeam?.(selectedTeam)
    onClose()
  }

  function getMemberTypes(member: TeamMember): TypeName[] {
    const record = PokemonRepository.findById(member.pokemonId)
    if (!record) return []
    const megas = PokemonRepository.getMegasByBaseId(member.pokemonId)
    const megaRecord = member.isMega && member.megaKey
      ? megas.find(m => m.key === member.megaKey) : null
    return (megaRecord?.types ?? record.types) as TypeName[]
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {mode === 'attacker' ? 'チームから攻撃ポケモンを選択' : 'チームを選択（防御側）'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {teams.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-600 text-center py-4">
              チームが登録されていません。<br />先にチーム管理でチームを作成してください。
            </p>
          ) : (
            <>
              {/* チーム選択タブ */}
              <div className="flex flex-wrap gap-1.5">
                {teams.map(team => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedTeamId === team.id
                        ? 'bg-blue-600 dark:bg-blue-700 border-blue-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    {team.name}
                    <span className="ml-1 opacity-70">({team.members.length})</span>
                  </button>
                ))}
              </div>

              {/* メンバー一覧 */}
              {selectedTeam && (
                <div
                  className="space-y-1.5"
                  onMouseEnter={() => { if (mode === 'defender') setIsListHovered(true) }}
                  onMouseLeave={() => setIsListHovered(false)}
                >
                  {selectedTeam.members.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-600 text-center py-4">
                      このチームにはメンバーがいません
                    </p>
                  ) : (
                    selectedTeam.members.map(member => {
                      const types = getMemberTypes(member)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => mode === 'attacker' ? handleSelectMember(member) : undefined}
                          onDoubleClick={() => mode === 'defender' ? handleSelectTeam() : undefined}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                            mode === 'attacker'
                              ? 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer'
                              : isListHovered
                                ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950 cursor-pointer select-none'
                                : 'border-slate-200 dark:border-slate-700 cursor-pointer select-none'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {member.pokemonName}
                              </span>
                              {member.isMega && <span className="text-xs text-indigo-500 font-bold">Mega</span>}
                              {types.map(t => <TypeBadge key={t} type={t as TypeName} size="sm" />)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                              {member.natureName}
                              {member.abilityName !== 'なし' && ` / ${member.abilityName}`}
                              {member.itemName && ` / ${member.itemName}`}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {member.moves.filter(Boolean).map((m, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                          {mode === 'attacker' && (
                            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium flex-shrink-0">選択 →</span>
                          )}
                          {mode === 'defender' && (
                            <span className="text-xs text-orange-400 dark:text-orange-500 font-medium flex-shrink-0">ダブルクリック →</span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {/* 防御モード: ダブルクリックヒント */}
              {mode === 'defender' && selectedTeam && selectedTeam.members.length > 0 && (
                <p className="text-xs text-center text-slate-400 dark:text-slate-600 pt-1">
                  ポケモンをダブルクリックするとチーム全員で防御計算を開始します
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
