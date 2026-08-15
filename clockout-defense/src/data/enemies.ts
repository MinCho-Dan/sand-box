import type { EnemyDef } from '../types'

export const ENEMIES: Record<string, EnemyDef> = {
  normal: {
    id: 'normal',
    name: '일반 업무',
    baseHp: 40,
    baseSpeed: 55,
    color: 0xd1d5db,
    reward: 12,
    damage: 6,
  },
  rush: {
    id: 'rush',
    name: '긴급 요청',
    baseHp: 22,
    baseSpeed: 120,
    color: 0xfb923c,
    reward: 14,
    damage: 8,
    tag: 'fast',
  },
  claim: {
    id: 'claim',
    name: '고객 클레임',
    baseHp: 130,
    baseSpeed: 32,
    color: 0xef4444,
    reward: 28,
    damage: 14,
    tag: 'tanky',
  },
}

/** 웨이브 번호(0-index)에 따라 등장할 적 구성을 계산한다. 상한 없이 계속 어려워진다. */
export function waveComposition(wave: number): EnemyDef[] {
  const list: EnemyDef[] = []
  const count = 6 + Math.floor(wave / 2)

  for (let i = 0; i < count; i++) {
    if (wave >= 4 && i % 5 === 4) {
      list.push(ENEMIES.claim)
    } else if (wave >= 2 && i % 3 === 2) {
      list.push(ENEMIES.rush)
    } else {
      list.push(ENEMIES.normal)
    }
  }
  return list
}

export function waveHpMult(wave: number): number {
  return 1 + wave * 0.14
}

export function waveSpeedMult(wave: number): number {
  return 1 + wave * 0.015
}
