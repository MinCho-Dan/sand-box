import { JOBS, RARITIES, LEVEL_STAT_GROWTH } from './data/employees'
import type { Employee } from './types'

/** 시너지 적용 전, 등급·레벨만 반영한 기본 공격력. */
export function baseAttack(emp: Employee): number {
  const job = JOBS[emp.jobId]
  const rarity = RARITIES[emp.rarity]
  const levelMult = 1 + (emp.level - 1) * LEVEL_STAT_GROWTH
  return job.baseAttack * rarity.statMult * levelMult
}

/** 시너지 적용 전, 레벨만 반영한 기본 공격속도. */
export function baseAttackSpeed(emp: Employee): number {
  const job = JOBS[emp.jobId]
  const levelMult = 1 + (emp.level - 1) * LEVEL_STAT_GROWTH
  return job.baseAttackSpeed * levelMult
}
