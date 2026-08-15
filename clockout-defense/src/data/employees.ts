import type { JobDef, RarityDef, Rarity } from '../types'

export const JOBS: Record<string, JobDef> = {
  developer: {
    id: 'developer',
    name: '개발자',
    color: 0x60a5fa,
    icon: '💻',
    description: '단일 대상에게 높은 화력을 낸다.',
    baseAttack: 18,
    baseAttackSpeed: 1.1,
    baseRange: 150,
  },
  qa: {
    id: 'qa',
    name: 'QA 엔지니어',
    color: 0x4ade80,
    icon: '🔍',
    description: '방어력이 높은 업무(고객 클레임)에 강하다.',
    baseAttack: 10,
    baseAttackSpeed: 0.9,
    baseRange: 130,
    vsTankyMult: 2.2,
  },
  devops: {
    id: 'devops',
    name: 'DevOps',
    color: 0xfacc15,
    icon: '⚙️',
    description: '빠른 공격속도로 끊임없이 배포한다.',
    baseAttack: 8,
    baseAttackSpeed: 1.8,
    baseRange: 140,
  },
  sales: {
    id: 'sales',
    name: '영업',
    color: 0xf87171,
    icon: '💼',
    description: '업무 처리 시 추가 Gold를 획득한다.',
    baseAttack: 12,
    baseAttackSpeed: 1.0,
    baseRange: 120,
    bonusGoldMult: 1.5,
  },
}

export const JOB_LIST = Object.values(JOBS)

export const RARITIES: Record<Rarity, RarityDef> = {
  1: { tier: 1, name: 'Common', statMult: 1, hireWeight: 65, color: 0x9ca3af },
  2: { tier: 2, name: 'Uncommon', statMult: 1.4, hireWeight: 30, color: 0x2dd4bf },
  3: { tier: 3, name: 'Rare', statMult: 2.0, hireWeight: 15, color: 0x38bdf8 },
  4: { tier: 4, name: 'Epic', statMult: 2.8, hireWeight: 6, color: 0xc084fc },
  5: { tier: 5, name: 'Legendary', statMult: 4.0, hireWeight: 2, color: 0xfbbf24 },
}

export const RARITY_LIST: RarityDef[] = [RARITIES[1], RARITIES[2], RARITIES[3], RARITIES[4], RARITIES[5]]

export const MIN_RARITY: Rarity = 1
export const MAX_RARITY: Rarity = 5

export const HIRE_COST = 100
export const LEVEL_STAT_GROWTH = 0.25

/** 직원 1명이 오를 수 있는 최대 레벨. 이 이상은 티어업 합체로만 더 강해진다. */
export const LEVEL_CAP = 10

/** 이미 배치된 직원을 골드로 강화(레벨업)할 때의 비용. 레벨이 오를수록 비싸진다. */
export function upgradeCost(level: number): number {
  return 80 + (level - 1) * 40
}
