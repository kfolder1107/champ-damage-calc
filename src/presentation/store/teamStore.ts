import { create } from 'zustand'
import type { Team, TeamMember } from '@/data/schemas/teamTypes'

const STORAGE_KEY = 'pokemon-champions-teams-v1'

function loadFromStorage(): Team[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Team[]
  } catch {
    return []
  }
}

function saveToStorage(teams: Team[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
  } catch {
    // ignore
  }
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface TeamStore {
  teams: Team[]
  /** チームを新規作成して返す */
  createTeam: (name: string) => Team
  /** チームを削除する */
  deleteTeam: (id: string) => void
  /** チーム名を変更する */
  updateTeamName: (id: string, name: string) => void
  /** メンバーを追加する（最大6匹） */
  addMember: (teamId: string, member: Omit<TeamMember, 'id'>) => TeamMember | null
  /** メンバーを更新する */
  updateMember: (teamId: string, member: TeamMember) => void
  /** メンバーを削除する */
  removeMember: (teamId: string, memberId: string) => void
  /** メンバーを別チームへコピーする（コピー先が満員なら false） */
  copyMember: (fromTeamId: string, memberId: string, toTeamId: string) => boolean
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: loadFromStorage(),

  createTeam: (name) => {
    const team: Team = { id: genId(), name, members: [] }
    set(s => {
      const teams = [...s.teams, team]
      saveToStorage(teams)
      return { teams }
    })
    return team
  },

  deleteTeam: (id) => {
    set(s => {
      const teams = s.teams.filter(t => t.id !== id)
      saveToStorage(teams)
      return { teams }
    })
  },

  updateTeamName: (id, name) => {
    set(s => {
      const teams = s.teams.map(t => t.id === id ? { ...t, name } : t)
      saveToStorage(teams)
      return { teams }
    })
  },

  addMember: (teamId, memberData) => {
    const team = get().teams.find(t => t.id === teamId)
    if (!team || team.members.length >= 6) return null
    const member: TeamMember = { id: genId(), ...memberData }
    set(s => {
      const teams = s.teams.map(t =>
        t.id === teamId ? { ...t, members: [...t.members, member] } : t
      )
      saveToStorage(teams)
      return { teams }
    })
    return member
  },

  updateMember: (teamId, member) => {
    set(s => {
      const teams = s.teams.map(t =>
        t.id === teamId
          ? { ...t, members: t.members.map(m => m.id === member.id ? member : m) }
          : t
      )
      saveToStorage(teams)
      return { teams }
    })
  },

  removeMember: (teamId, memberId) => {
    set(s => {
      const teams = s.teams.map(t =>
        t.id === teamId
          ? { ...t, members: t.members.filter(m => m.id !== memberId) }
          : t
      )
      saveToStorage(teams)
      return { teams }
    })
  },

  copyMember: (fromTeamId, memberId, toTeamId) => {
    const state = get()
    const fromTeam = state.teams.find(t => t.id === fromTeamId)
    const toTeam = state.teams.find(t => t.id === toTeamId)
    if (!fromTeam || !toTeam || toTeam.members.length >= 6) return false
    const member = fromTeam.members.find(m => m.id === memberId)
    if (!member) return false
    const newMember: TeamMember = { ...member, id: genId() }
    set(s => {
      const teams = s.teams.map(t =>
        t.id === toTeamId ? { ...t, members: [...t.members, newMember] } : t
      )
      saveToStorage(teams)
      return { teams }
    })
    return true
  },
}))
