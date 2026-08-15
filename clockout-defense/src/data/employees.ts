import type { JobDef, RarityDef } from '../types'

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

export const RARITIES: Record<string, RarityDef> = {
  common: { id: 'common', name: 'Common', statMult: 1, hireWeight: 65, color: 0x9ca3af },
  rare: { id: 'rare', name: 'Rare', statMult: 1.6, hireWeight: 27, color: 0x38bdf8 },
  epic: { id: 'epic', name: 'Epic', statMult: 2.6, hireWeight: 8, color: 0xc084fc },
}

export const RARITY_LIST = Object.values(RARITIES)

export const HIRE_COST = 100
export const LEVEL_STAT_GROWTH = 0.25
