import { useState, useEffect, useRef } from 'react'
import { useTeamStore } from '@/presentation/store/teamStore'
import { TeamMemberEditor } from '@/presentation/components/team/TeamMemberEditor'
import { TypeBadge } from '@/presentation/components/shared/Badge'
import { PokemonRepository } from '@/data/repositories/PokemonRepository'
import { NATURE_TABLE, getNatureModifier } from '@/domain/constants/natureModifiers'
import { calculateHP, calculateNonHP } from '@/domain/calculators/StatCalculator'
import type { Team, TeamMember } from '@/data/schemas/teamTypes'
import type { TypeName, BaseStats, StatKey } from '@/domain/models/Pokemon'
import type { NatureModifier } from '@/domain/constants/natureModifiers'

/** 選択中チームのメンバー一覧 + 編集UI */
function TeamDetail({ team, allTeams }: { team: Team; allTeams: Team[] }) {
  const { addMember, updateMember, removeMember, updateTeamName, copyMember } = useTeamStore()
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(team.name)

  function handleSaveName() {
    if (nameInput.trim()) updateTeamName(team.id, nameInput.trim())
    setEditingName(false)
  }

  function handleAddMember(data: Omit<TeamMember, 'id'>) {
    addMember(team.id, data)
    setShowAddForm(false)
  }

  function handleUpdateMember(data: Omit<TeamMember, 'id'>) {
    if (!editingMemberId) return
    updateMember(team.id, { id: editingMemberId, ...data })
    setEditingMemberId(null)
  }

  function handleCopyMember(memberId: string, toTeamId: string) {
    copyMember(team.id, memberId, toTeamId)
  }

  const editingMember = team.members.find(m => m.id === editingMemberId)
  const showForm = showAddForm || editingMemberId !== null

  return (
    <div className="flex-1 min-w-0 space-y-4">
      {/* チーム名編集 */}
      <div className="flex items-center gap-2">
        {editingName ? (
          <>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
              className="input-base flex-1 text-base font-semibold"
              autoFocus
            />
            <button type="button" onClick={handleSaveName} className="btn-primary text-xs px-3 py-1.5">保存</button>
            <button type="button" onClick={() => { setEditingName(false); setNameInput(team.name) }} className="btn-ghost text-xs px-3 py-1.5">取消</button>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex-1">{team.name}</h2>
            <button type="button" onClick={() => { setEditingName(true); setNameInput(team.name) }} className="btn-ghost text-xs px-2 py-1">✏ 名前変更</button>
          </>
        )}
      </div>

      {/* メンバー一覧 */}
      <div className="space-y-2">
        {team.members.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-600 py-4 text-center">
            メンバーが登録されていません
          </p>
        )}
        {team.members.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            onEdit={() => { setEditingMemberId(member.id); setShowAddForm(false) }}
            onDelete={() => removeMember(team.id, member.id)}
            onCopy={(toTeamId) => handleCopyMember(member.id, toTeamId)}
            isEditing={editingMemberId === member.id}
            copyTargets={allTeams.filter(t => t.id !== team.id && t.members.length < 6)}
          />
        ))}
      </div>

      {/* 編集フォーム */}
      {showForm && (
        <div className="panel border-2 border-blue-300 dark:border-blue-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {editingMemberId ? 'メンバーを編集' : 'メンバーを追加'}
          </h3>
          <TeamMemberEditor
            initial={editingMember}
            onSave={editingMemberId ? handleUpdateMember : handleAddMember}
            onCancel={() => { setShowAddForm(false); setEditingMemberId(null) }}
          />
        </div>
      )}

      {/* 追加ボタン */}
      {!showForm && team.members.length < 6 && (
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setEditingMemberId(null) }}
          className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg py-3 text-sm text-slate-500 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          ＋ メンバーを追加（{team.members.length}/6）
        </button>
      )}
    </div>
  )
}

/** メンバー1匹のカード表示 */
function MemberCard({
  member, onEdit, onDelete, onCopy, isEditing, copyTargets,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
  onCopy: (toTeamId: string) => void
  isEditing: boolean
  copyTargets: Team[]
}) {
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null)
  const copyMenuRef = useRef<HTMLDivElement>(null)

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!showCopyMenu) return
    function handleClick(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCopyMenu])

  function handleCopy(toTeamId: string) {
    onCopy(toTeamId)
    setCopiedTeamId(toTeamId)
    setShowCopyMenu(false)
    setTimeout(() => setCopiedTeamId(null), 2000)
  }

  const record = PokemonRepository.findById(member.pokemonId)
  const megas = record ? PokemonRepository.getMegasByBaseId(member.pokemonId) : []
  const megaRecord = member.isMega && member.megaKey
    ? megas.find(m => m.key === member.megaKey)
    : null

  const baseStats = (megaRecord?.baseStats ?? record?.baseStats) as BaseStats | undefined
  const types = (megaRecord?.types ?? record?.types) as TypeName[] | undefined

  function getStatValue(stat: StatKey, base: number): number {
    if (stat === 'hp') return calculateHP(base, member.sp.hp)
    const n = getNatureModifier(member.natureName, stat) as NatureModifier
    return calculateNonHP(base, member.sp[stat], n)
  }

  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const
  const statKeys: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

  const natureDat = NATURE_TABLE[member.natureName]
  const natureLabel = natureDat
    ? `${member.natureName}${natureDat.up ? `(↑${natureDat.up === 'atk' ? 'A' : natureDat.up === 'def' ? 'B' : natureDat.up === 'spa' ? 'C' : natureDat.up === 'spd' ? 'D' : 'S'})` : ''}`
    : member.natureName

  return (
    <div className={`panel transition-colors ${isEditing ? 'border-blue-400 dark:border-blue-600' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* ポケモン名 + タイプ + メガ */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{member.pokemonName}</span>
            {member.isMega && <span className="text-xs text-indigo-500 font-bold">Mega</span>}
            {types?.map(t => <TypeBadge key={t} type={t as TypeName} />)}
          </div>

          {/* 実数値 */}
          {baseStats && (
            <div className="flex gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 flex-wrap mb-1">
              {statKeys.map((key, i) => {
                const base = baseStats[key]
                const val = getStatValue(key, base)
                const n = key !== 'hp' ? getNatureModifier(member.natureName, key) : 1.0
                const color = n > 1.0 ? 'text-blue-500' : n < 1.0 ? 'text-red-500' : ''
                return (
                  <span key={key} className={color}>
                    {statLabels[i]}{val}
                  </span>
                )
              })}
            </div>
          )}

          {/* 性格 / 特性 / 持ち物 */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-500 mb-1">
            <span>{natureLabel}</span>
            {member.abilityName !== 'なし' && <span>{member.abilityName}</span>}
            {member.itemName && <span>{member.itemName}</span>}
          </div>

          {/* 技 */}
          <div className="flex flex-wrap gap-1">
            {member.moves.filter(Boolean).map((m, i) => (
              <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            編集
          </button>

          {/* コピーボタン + ドロップダウン */}
          <div className="relative" ref={copyMenuRef}>
            <button
              type="button"
              onClick={() => copyTargets.length > 0 && setShowCopyMenu(v => !v)}
              disabled={copyTargets.length === 0}
              title={copyTargets.length === 0 ? 'コピー先のチームがありません' : 'コピー先を選択'}
              className={`w-full text-xs px-2 py-1 rounded border transition-colors ${
                copiedTeamId
                  ? 'border-green-400 dark:border-green-600 text-green-600 dark:text-green-400'
                  : copyTargets.length === 0
                    ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {copiedTeamId ? '✓ コピー済' : 'コピー'}
            </button>

            {showCopyMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[130px]">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 px-3 pt-2 pb-1">コピー先チーム</p>
                {copyTargets.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleCopy(t.id)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 last:rounded-b-lg transition-colors"
                  >
                    {t.name}
                    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">({t.members.length}/6)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-500 hover:border-red-400 dark:hover:border-red-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

/** チームリスト（サイドバー） */
function TeamList({
  teams,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: {
  teams: Team[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="w-full lg:w-56 xl:w-64 flex-shrink-0 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">チーム一覧</h2>
        <button
          type="button"
          onClick={onCreate}
          className="btn-primary text-xs px-2 py-1"
        >
          ＋ 新規
        </button>
      </div>
      {teams.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-600 py-2 text-center">チームがありません</p>
      )}
      <div className="space-y-1">
        {teams.map(team => (
          <div
            key={team.id}
            className={`flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
              selectedId === team.id
                ? 'bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700'
                : 'border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => onSelect(team.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{team.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-600">{team.members.length}/6 匹</div>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(team.id) }}
              className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1"
              title="チームを削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** チーム管理ページ */
export function TeamManager() {
  const { teams, createTeam, deleteTeam } = useTeamStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams[0]?.id ?? null)
  const [newTeamName, setNewTeamName] = useState('')
  const [showNewTeamForm, setShowNewTeamForm] = useState(false)

  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null

  function handleCreateTeam() {
    const name = newTeamName.trim() || `チーム${teams.length + 1}`
    const team = createTeam(name)
    setSelectedTeamId(team.id)
    setNewTeamName('')
    setShowNewTeamForm(false)
  }

  function handleDeleteTeam(id: string) {
    deleteTeam(id)
    if (selectedTeamId === id) {
      const remaining = teams.filter(t => t.id !== id)
      setSelectedTeamId(remaining[0]?.id ?? null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* サイドバー: チームリスト */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-2">
          <TeamList
            teams={teams}
            selectedId={selectedTeamId}
            onSelect={setSelectedTeamId}
            onCreate={() => setShowNewTeamForm(true)}
            onDelete={handleDeleteTeam}
          />

          {/* 新チーム作成フォーム */}
          {showNewTeamForm && (
            <div className="panel border-2 border-blue-300 dark:border-blue-700 space-y-2">
              <label className="label block">チーム名</label>
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam() }}
                placeholder={`チーム${teams.length + 1}`}
                className="input-base w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleCreateTeam} className="flex-1 btn-primary text-xs py-1.5">作成</button>
                <button type="button" onClick={() => setShowNewTeamForm(false)} className="flex-1 btn-ghost text-xs py-1.5">取消</button>
              </div>
            </div>
          )}
        </div>

        {/* メインエリア: チーム詳細 */}
        <div className="flex-1 min-w-0">
          {selectedTeam ? (
            <TeamDetail key={selectedTeam.id} team={selectedTeam} allTeams={teams} />
          ) : (
            <div className="panel text-center py-12">
              <p className="text-slate-500 dark:text-slate-600 text-sm mb-4">
                チームを選択するか、新規作成してください
              </p>
              <button
                type="button"
                onClick={() => setShowNewTeamForm(true)}
                className="btn-primary text-sm px-6 py-2"
              >
                ＋ チームを作成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
