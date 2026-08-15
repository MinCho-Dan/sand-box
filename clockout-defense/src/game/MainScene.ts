import Phaser from 'phaser'
import { EventBus } from './EventBus'
import { JOBS, JOB_LIST, RARITIES, RARITY_LIST, HIRE_COST } from '../data/employees'
import { waveComposition, waveHpMult, waveSpeedMult } from '../data/enemies'
import { SYNERGIES } from '../data/synergies'
import { baseAttack, baseAttackSpeed, basePower } from '../stats'
import type { Employee, EnemyDef, GameSnapshot, JobId, Rarity } from '../types'

// 세로형(모바일 우선) 필드. 업무는 위에서 아래로 내려와 하단의 회사를 위협한다.
const FIELD_W = 450
const FIELD_H = 800
const PATH_X = 225
const BASE_Y = 720
const SPAWN_Y = -20
const SPAWN_INTERVAL_MS = 650
const INTERMISSION_MS = 4000
const START_GOLD = 300
const START_HP = 100
const EMIT_INTERVAL_MS = 150

const SLOT_POS = [
  { x: 115, y: 130 },
  { x: 335, y: 130 },
  { x: 115, y: 300 },
  { x: 335, y: 300 },
  { x: 115, y: 470 },
  { x: 335, y: 470 },
  { x: 115, y: 640 },
  { x: 335, y: 640 },
]

/** 각 슬롯이 열리는 최소 웨이브(0-index). 0 은 시작부터 열려 있다는 뜻. */
const SLOT_UNLOCK_WAVE = [0, 0, 0, 5, 0, 0, 0, 10]

interface RuntimeEnemy {
  uid: string
  def: EnemyDef
  hp: number
  maxHp: number
  speed: number
  y: number
  container: Phaser.GameObjects.Container
  circle: Phaser.GameObjects.Arc
  hpFg: Phaser.GameObjects.Rectangle
}

interface MergeResult {
  jobId: JobId
  rarity: Rarity
  toLevel: number
}

function pickWeighted<T extends { hireWeight?: number }>(list: T[], weight: (item: T) => number): T {
  const total = list.reduce((sum, item) => sum + weight(item), 0)
  let r = Math.random() * total
  for (const item of list) {
    r -= weight(item)
    if (r <= 0) return item
  }
  return list[list.length - 1]
}

export class MainScene extends Phaser.Scene {
  private employees: Employee[] = []
  private gold = START_GOLD
  private hp = START_HP
  private wave = 0
  private score = 0
  private speedMult: 1 | 2 | 3 = 1
  private gameOver = false
  private waveIntermission = true
  private intermissionTimer = 1500
  private spawnQueue: EnemyDef[] = []
  private spawnTimer = 0
  private enemies: RuntimeEnemy[] = []
  private cooldowns = new Map<string, number>()
  private selectedUid: string | null = null
  private idCounter = 0
  private emitAccumulator = 0
  private playTimeMs = 0
  private promotionSeq = 0
  private lastPromotionText = ''

  private slotGfx: Phaser.GameObjects.Rectangle[] = []
  private slotLockGfx: Phaser.GameObjects.Container[] = []
  private slotContent = new Map<number, Phaser.GameObjects.Container>()

  private boundHandlers: Array<[string, (...args: never[]) => void]> = []

  constructor() {
    super('main')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')

    // 이동 경로 (위 → 아래)
    this.add.rectangle(PATH_X, FIELD_H / 2, 140, FIELD_H, 0x1e293b)
    this.add.rectangle(PATH_X, FIELD_H / 2, 2, FIELD_H, 0x334155)

    // 회사(기지)
    this.add.rectangle(PATH_X, BASE_Y + 20, 140, 40, 0x8fe3c0).setAlpha(0.85)
    this.add.text(PATH_X, BASE_Y - 20, '회사', { fontSize: '14px', color: '#8fe3c0' }).setOrigin(0.5)

    SLOT_POS.forEach((pos, i) => {
      const rect = this.add.rectangle(pos.x, pos.y, 64, 64, 0x1e293b, 0.6)
      rect.setStrokeStyle(2, 0x475569)
      rect.setInteractive({ useHandCursor: true })
      rect.on('pointerdown', () => this.onSlotClick(i))
      this.slotGfx.push(rect)

      const lockContainer = this.add.container(pos.x, pos.y)
      const lockIcon = this.add.text(0, -8, '🔒', { fontSize: '18px' }).setOrigin(0.5)
      const lockLabel = this.add
        .text(0, 14, `Wave ${SLOT_UNLOCK_WAVE[i] + 1}`, { fontSize: '10px', color: '#64748b' })
        .setOrigin(0.5)
      lockContainer.add([lockIcon, lockLabel])
      this.slotLockGfx.push(lockContainer)
    })
    this.refreshSlotLocks()

    this.registerBusHandler('hire', () => this.hireRandomEmployee())
    this.registerBusHandler('select-employee', (uid: string) => {
      this.selectedUid = this.selectedUid === uid ? null : uid
      this.redrawSlotHighlights()
      this.emitState()
    })
    this.registerBusHandler('auto-arrange', () => this.autoArrange())
    this.registerBusHandler('set-speed', (n: 1 | 2 | 3) => {
      this.speedMult = n
      this.emitState()
    })
    this.registerBusHandler('skip-intermission', () => {
      if (this.waveIntermission) this.intermissionTimer = 0
    })
    this.registerBusHandler('restart', () => this.resetGame())

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [event, handler] of this.boundHandlers) EventBus.off(event, handler)
    })

    this.emitState()
  }

  private registerBusHandler(event: string, handler: (...args: never[]) => void) {
    EventBus.on(event, handler)
    this.boundHandlers.push([event, handler])
  }

  private resetGame() {
    this.employees = []
    this.gold = START_GOLD
    this.hp = START_HP
    this.wave = 0
    this.score = 0
    this.gameOver = false
    this.waveIntermission = true
    this.intermissionTimer = 1500
    this.spawnQueue = []
    this.cooldowns.clear()
    this.selectedUid = null
    this.playTimeMs = 0
    this.promotionSeq = 0
    this.lastPromotionText = ''
    for (const e of this.enemies) e.container.destroy()
    this.enemies = []
    this.refreshSlotLocks()
    this.redrawAllSlots()
    this.emitState()
  }

  private genId() {
    this.idCounter += 1
    return `emp-${this.idCounter}`
  }

  /** 채용 즉시 동일 직무·등급·레벨 직원이 있으면 자동으로 합쳐 승진시킨다.
   * 대기 명단이 무한히 쌓이는 것을 막고, 흔한 랜타디 관례("합치면 상위 유닛")를 따른다. */
  private hireRandomEmployee() {
    if (this.gameOver || this.gold < HIRE_COST) return
    this.gold -= HIRE_COST
    const job = Phaser.Utils.Array.GetRandom(JOB_LIST)
    const rarity = pickWeighted(RARITY_LIST, (r) => r.hireWeight)
    const emp: Employee = { uid: this.genId(), jobId: job.id, rarity: rarity.id, level: 1, slotIndex: null }
    this.employees.push(emp)

    const merges: MergeResult[] = []
    let result = this.mergeOnce()
    while (result) {
      merges.push(result)
      result = this.mergeOnce()
    }
    if (merges.length > 0) {
      const counts = new Map<string, number>()
      for (const m of merges) {
        const key = `${JOBS[m.jobId].name} → Lv.${m.toLevel}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      this.lastPromotionText = Array.from(counts.entries())
        .map(([label, count]) => `${label} ×${count}`)
        .join(', ')
      this.promotionSeq += 1
      this.redrawAllSlots() // 배치된 직원이 합쳐진 경우 슬롯 표시(레벨·ATK)도 갱신
    }

    this.emitState()
  }

  /** 동일 직무·등급·레벨 2명을 찾아 하나로 합친다. 합쳐졌다면 결과를, 없으면 null 을 반환한다. */
  private mergeOnce(): MergeResult | null {
    const groups = new Map<string, Employee[]>()
    for (const e of this.employees) {
      const key = `${e.jobId}|${e.rarity}|${e.level}`
      const arr = groups.get(key) ?? []
      arr.push(e)
      groups.set(key, arr)
    }
    for (const arr of groups.values()) {
      if (arr.length >= 2) {
        const [a, b] = arr
        a.level += 1
        if (a.slotIndex === null && b.slotIndex !== null) a.slotIndex = b.slotIndex
        this.employees.splice(this.employees.indexOf(b), 1)
        return { jobId: a.jobId, rarity: a.rarity, toLevel: a.level }
      }
    }
    return null
  }

  /** 개발자·QA·DevOps 를 우선 확보해 시너지를 최대한 발동시키고, 남은 슬롯은 화력 순으로 채운다. */
  private autoArrange() {
    if (this.gameOver) return
    for (const e of this.employees) e.slotIndex = null

    const unlocked = this.unlockedSlotIndices()
    const chosen: Employee[] = []
    const bestOfJob = (job: JobId) =>
      this.employees
        .filter((e) => e.jobId === job && !chosen.includes(e))
        .sort((a, b) => basePower(b) - basePower(a))[0]

    const dev = bestOfJob('developer')
    if (dev) {
      chosen.push(dev)
      const qa = bestOfJob('qa')
      if (qa) chosen.push(qa)
      const devops = bestOfJob('devops')
      if (devops) chosen.push(devops)
    }

    const rest = this.employees.filter((e) => !chosen.includes(e)).sort((a, b) => basePower(b) - basePower(a))
    for (const e of rest) {
      if (chosen.length >= unlocked.length) break
      chosen.push(e)
    }

    chosen.slice(0, unlocked.length).forEach((e, i) => {
      e.slotIndex = unlocked[i]
    })

    this.redrawAllSlots()
    this.emitState()
  }

  private unlockedSlotIndices(): number[] {
    return SLOT_UNLOCK_WAVE.map((w, i) => (w <= this.wave ? i : -1)).filter((i) => i >= 0)
  }

  private isSlotUnlocked(i: number): boolean {
    return SLOT_UNLOCK_WAVE[i] <= this.wave
  }

  private nextSlotUnlockWaveDisplay(): number | null {
    const upcoming = SLOT_UNLOCK_WAVE.filter((w) => w > this.wave).sort((a, b) => a - b)
    return upcoming.length === 0 ? null : upcoming[0] + 1
  }

  private refreshSlotLocks() {
    SLOT_POS.forEach((_, i) => {
      const unlocked = this.isSlotUnlocked(i)
      const rect = this.slotGfx[i]
      rect.setFillStyle(0x1e293b, unlocked ? 0.6 : 0.3)
      this.slotLockGfx[i].setVisible(!unlocked)
      if (unlocked) rect.setInteractive({ useHandCursor: true })
      else rect.disableInteractive()
    })
    this.redrawSlotHighlights()
  }

  private onSlotClick(slotIndex: number) {
    if (this.gameOver || !this.isSlotUnlocked(slotIndex)) return
    const occupant = this.employees.find((e) => e.slotIndex === slotIndex)

    if (this.selectedUid) {
      const emp = this.employees.find((e) => e.uid === this.selectedUid)
      if (emp) {
        const prevSlot = emp.slotIndex
        if (occupant && occupant.uid !== emp.uid) occupant.slotIndex = prevSlot
        emp.slotIndex = slotIndex
      }
      this.selectedUid = null
    } else if (occupant) {
      occupant.slotIndex = null
    }
    this.redrawAllSlots()
    this.emitState()
  }

  private activeSynergyIds(): string[] {
    const placedJobs = new Set(
      this.employees.filter((e) => e.slotIndex !== null).map((e) => e.jobId),
    )
    return SYNERGIES.filter((s) => s.requiredJobs.every((j) => placedJobs.has(j))).map((s) => s.id)
  }

  private effectiveStats(emp: Employee, activeIds: string[]) {
    const job = JOBS[emp.jobId]
    let atk = baseAttack(emp)
    let atkSpeed = baseAttackSpeed(emp)

    for (const id of activeIds) {
      const syn = SYNERGIES.find((s) => s.id === id)
      if (syn && syn.appliesTo.includes(job.id)) {
        if (syn.attackMult) atk *= syn.attackMult
        if (syn.attackSpeedMult) atkSpeed *= syn.attackSpeedMult
      }
    }
    return { atk, atkSpeed, range: job.baseRange, vsTankyMult: job.vsTankyMult, bonusGoldMult: job.bonusGoldMult }
  }

  private redrawSlotHighlights() {
    SLOT_POS.forEach((_, i) => {
      const rect = this.slotGfx[i]
      if (!this.isSlotUnlocked(i)) {
        rect.setStrokeStyle(2, 0x334155)
        return
      }
      const occupied = this.employees.some((e) => e.slotIndex === i)
      if (!occupied && this.selectedUid) {
        rect.setStrokeStyle(3, 0xfacc15)
      } else {
        rect.setStrokeStyle(2, 0x475569)
      }
    })
  }

  private redrawAllSlots() {
    for (const c of this.slotContent.values()) c.destroy()
    this.slotContent.clear()

    const activeIds = this.activeSynergyIds()

    for (const emp of this.employees) {
      if (emp.slotIndex === null) continue
      const pos = SLOT_POS[emp.slotIndex]
      const job = JOBS[emp.jobId]
      const rarity = RARITIES[emp.rarity]
      const stats = this.effectiveStats(emp, activeIds)

      const container = this.add.container(pos.x, pos.y)
      const bg = this.add.rectangle(0, 0, 60, 60, job.color, 0.25)
      bg.setStrokeStyle(3, rarity.color)
      const icon = this.add.text(0, -14, job.icon, { fontSize: '22px' }).setOrigin(0.5)
      const lvl = this.add.text(0, 10, `Lv.${emp.level}`, { fontSize: '10px', color: '#e2e8f0' }).setOrigin(0.5)
      const atkTxt = this.add
        .text(0, 22, `ATK ${Math.round(stats.atk)}`, { fontSize: '9px', color: '#94a3b8' })
        .setOrigin(0.5)
      container.add([bg, icon, lvl, atkTxt])
      container.setSize(60, 60)
      container.setInteractive({ useHandCursor: true })
      container.on('pointerdown', (_p: unknown, _lx: number, _ly: number, event: { stopPropagation: () => void }) => {
        event.stopPropagation()
        this.onSlotClick(emp.slotIndex as number)
      })
      this.slotContent.set(emp.slotIndex, container)
    }
    this.redrawSlotHighlights()
  }

  private startWave() {
    this.waveIntermission = false
    this.spawnQueue = waveComposition(this.wave).slice()
    this.spawnTimer = 0
  }

  private spawnNextEnemy() {
    const def = this.spawnQueue.shift()
    if (!def) return
    const hp = Math.round(def.baseHp * waveHpMult(this.wave))
    const speed = def.baseSpeed * waveSpeedMult(this.wave)
    const radius = def.tag === 'tanky' ? 18 : 13

    const container = this.add.container(PATH_X, SPAWN_Y)
    const circle = this.add.circle(0, 0, radius, def.color)
    const hpBg = this.add.rectangle(0, -radius - 10, 28, 5, 0x111827)
    const hpFg = this.add.rectangle(0, -radius - 10, 28, 5, 0x22c55e)
    container.add([circle, hpBg, hpFg])

    this.enemies.push({
      uid: this.genId(),
      def,
      hp,
      maxHp: hp,
      speed,
      y: SPAWN_Y,
      container,
      circle,
      hpFg,
    })
  }

  private dealDamage(enemy: RuntimeEnemy, dmg: number) {
    enemy.hp -= dmg
    enemy.hpFg.width = Math.max(0, (enemy.hp / enemy.maxHp) * 28)

    const txt = this.add
      .text(enemy.container.x, enemy.container.y - 30, `-${Math.round(dmg)}`, {
        fontSize: '13px',
        color: '#fde047',
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: txt, y: txt.y - 24, alpha: 0, duration: 500, onComplete: () => txt.destroy() })
  }

  private removeEnemy(enemy: RuntimeEnemy) {
    enemy.container.destroy()
    this.enemies = this.enemies.filter((e) => e.uid !== enemy.uid)
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return
    const dt = delta * this.speedMult
    this.playTimeMs += dt

    // 웨이브/스폰 진행
    if (this.waveIntermission) {
      this.intermissionTimer -= dt
      if (this.intermissionTimer <= 0) this.startWave()
    } else if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) {
        this.spawnNextEnemy()
        this.spawnTimer = SPAWN_INTERVAL_MS
      }
    } else if (this.enemies.length === 0) {
      this.gold += 50 + this.wave * 5
      this.score += 200
      this.wave += 1
      this.waveIntermission = true
      this.intermissionTimer = INTERMISSION_MS
      this.refreshSlotLocks()
    }

    // 적 이동 (위 → 아래)
    for (const enemy of [...this.enemies]) {
      enemy.y += (enemy.speed * dt) / 1000
      enemy.container.y = enemy.y
      if (enemy.y >= BASE_Y) {
        this.hp -= enemy.def.damage
        this.removeEnemy(enemy)
        if (this.hp <= 0) {
          this.hp = 0
          this.gameOver = true
        }
      }
    }

    // 직원 공격
    if (!this.gameOver) {
      const activeIds = this.activeSynergyIds()
      for (const emp of this.employees) {
        if (emp.slotIndex === null) continue
        const cd = (this.cooldowns.get(emp.uid) ?? 0) - dt
        if (cd > 0) {
          this.cooldowns.set(emp.uid, cd)
          continue
        }
        const pos = SLOT_POS[emp.slotIndex]
        const stats = this.effectiveStats(emp, activeIds)
        let target: RuntimeEnemy | null = null
        let bestProgress = -Infinity
        for (const enemy of this.enemies) {
          const dist = Phaser.Math.Distance.Between(pos.x, pos.y, PATH_X, enemy.y)
          if (dist <= stats.range && enemy.y > bestProgress) {
            bestProgress = enemy.y
            target = enemy
          }
        }
        if (target) {
          const dmg = stats.atk * (target.def.tag === 'tanky' && stats.vsTankyMult ? stats.vsTankyMult : 1)
          this.dealDamage(target, dmg)
          this.cooldowns.set(emp.uid, 1000 / stats.atkSpeed)

          if (target.hp <= 0) {
            this.gold += target.def.reward * (stats.bonusGoldMult ?? 1)
            this.score += target.def.reward * 5 + 10
            this.removeEnemy(target)
          }
        }
      }
    }

    this.emitAccumulator += delta
    if (this.emitAccumulator >= EMIT_INTERVAL_MS || this.gameOver) {
      this.emitAccumulator = 0
      this.emitState()
    }
  }

  private emitState() {
    const snapshot: GameSnapshot = {
      hp: this.hp,
      maxHp: START_HP,
      gold: Math.round(this.gold),
      wave: this.wave + 1,
      score: Math.round(this.score),
      speed: this.speedMult,
      gameOver: this.gameOver,
      employees: this.employees.map((e) => ({ ...e })),
      slotCount: SLOT_POS.length,
      unlockedSlotCount: this.unlockedSlotIndices().length,
      nextSlotUnlockWave: this.nextSlotUnlockWaveDisplay(),
      activeSynergyIds: this.activeSynergyIds(),
      waveIntermission: this.waveIntermission,
      intermissionSecondsLeft: this.waveIntermission ? Math.max(0, Math.ceil(this.intermissionTimer / 1000)) : 0,
      playTimeSeconds: Math.floor(this.playTimeMs / 1000),
      selectedUid: this.selectedUid,
      promotionSeq: this.promotionSeq,
      lastPromotionText: this.lastPromotionText,
    }
    EventBus.emit('state-update', snapshot)
  }
}

export function jobName(id: JobId) {
  return JOBS[id].name
}

export const FIELD_SIZE = { width: FIELD_W, height: FIELD_H }
