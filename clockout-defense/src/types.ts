export type JobId = 'developer' | 'qa' | 'devops' | 'sales'

/** 1(Common) ~ 5(Legendary) 등급 티어. */
export type Rarity = 1 | 2 | 3 | 4 | 5

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

export interface RarityDef {
  tier: Rarity
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
  /** 인덱스 = 슬롯 번호. 비어 있으면 null. */
  slots: (Employee | null)[]
  slotCount: number
  unlockedSlotCount: number
  nextSlotUnlockWave: number | null
  activeSynergyIds: string[]
  waveIntermission: boolean
  /** 첫 웨이브 시작 전, 직원을 하나도 배치하지 않아 대기 중인 상태 */
  waitingForFirstHire: boolean
  intermissionSecondsLeft: number
  playTimeSeconds: number
  upgradeSeq: number
  lastUpgradeText: string
}
