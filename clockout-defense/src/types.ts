export type JobId = 'developer' | 'qa' | 'devops' | 'sales'

export type Rarity = 'common' | 'rare' | 'epic'

export interface JobDef {
  id: JobId
  name: string
  /** 배치 슬롯/투사체에 쓰는 색상 (hex) */
  color: number
  icon: string
  description: string
  baseAttack: number
  /** 초당 공격 횟수 */
  baseAttackSpeed: number
  baseRange: number
  /** 'tanky' 적에게 추가 피해 배율 */
  vsTankyMult?: number
  /** 처치 시 추가 골드 배율 */
  bonusGoldMult?: number
}

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic']

export interface RarityDef {
  id: Rarity
  name: string
  statMult: number
  hireWeight: number
  color: number
}

export interface Employee {
  uid: string
  jobId: JobId
  rarity: Rarity
  level: number
  slotIndex: number | null
}

export interface EnemyDef {
  id: string
  name: string
  baseHp: number
  baseSpeed: number
  color: number
  reward: number
  damage: number
  tag?: 'tanky' | 'fast'
}

export interface SynergyDef {
  id: string
  name: string
  requiredJobs: JobId[]
  /** 이 시너지가 발동됐을 때 실제로 버프를 받는 직무들 */
  appliesTo: JobId[]
  description: string
  attackMult?: number
  attackSpeedMult?: number
  goldMult?: number
}

export interface GameSnapshot {
  hp: number
  maxHp: number
  gold: number
  wave: number
  score: number
  speed: 1 | 2 | 3
  gameOver: boolean
  employees: Employee[]
  slotCount: number
  unlockedSlotCount: number
  nextSlotUnlockWave: number | null
  activeSynergyIds: string[]
  waveIntermission: boolean
  intermissionSecondsLeft: number
  playTimeSeconds: number
  selectedUid: string | null
  promotionSeq: number
  lastPromotionText: string
}
