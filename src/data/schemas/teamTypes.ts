import type { SpDistribution } from '@/domain/models/StatPoints'

/** チームメンバー（ポケモン1匹分の登録情報） */
export interface TeamMember {
  id: string
  pokemonId: number
  pokemonName: string
  sp: SpDistribution
  /** 性格名（がんばりや / いじっぱり 等） */
  natureName: string
  abilityName: string
  itemName: string | null
  isMega: boolean
  megaKey: string | null
  moves: [string | null, string | null, string | null, string | null]
}

/** チーム（最大6匹） */
export interface Team {
  id: string
  name: string
  members: TeamMember[]
}
