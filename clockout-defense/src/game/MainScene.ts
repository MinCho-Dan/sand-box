import Phaser from 'phaser'
import { EventBus } from './EventBus'
import { JOBS, JOB_LIST, RARITIES, RARITY_LIST, HIRE_COST, LEVEL_STAT_GROWTH } from '../data/employees'
import { waveComposition, waveHpMult, waveSpeedMult } from '../data/enemies'
import { SYNERGIES } from '../data/synergies'
import type { Employee, EnemyDef, GameSnapshot, JobId } from '../types'

const FIELD_W = 800
const FIELD_H = 480
const PATH_Y = 260
const BASE_X = 770
const SPAWN_X = -20
const SPAWN_INTERVAL_MS = 650
const INTERMISSION_MS = 4000
const START_GOLD = 300
const START_HP = 100
const EMIT_INTERVAL_MS = 150

const SLOT_POS = [
  { x: 160, y: 170 },
  { x: 340, y: 170 },
  { x: 520, y: 170 },
  { x: 160, y: 350 },
  { x: 340, y: 350 },
  { x: 520, y: 350 },
]

interface RuntimeEnemy {
  uid: string
  def: EnemyDef
  hp: number
  maxHp: number
  speed: number
  x: number
  container: Phaser.GameObjects.Container
  circle: Phaser.GameObjects.Arc
  hpFg: Phaser.GameObjects.Rectangle
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

  private slotGfx: Phaser.GameObjects.Rectangle[] = []
  private slotContent = new Map<number, Phaser.GameObjects.Container>()

  private boundHandlers: Array<[string, (...args: never[]) => void]> = []

  constructor() {
    super('main')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')

    // 이동 경로
    this.add.rectangle(FIELD_W / 2, PATH_Y, FIELD_W, 44, 0x1e293b)
    this.add.rectangle(FIELD_W / 2, PATH_Y, FIELD_W, 2, 0x334155)

    // 회사(기지)
    this.add.rectangle(BASE_X + 15, PATH_Y, 30, 120, 0x8fe3c0).setAlpha(0.85)
    this.add.text(BASE_X + 15, PATH_Y - 78, '회사', { fontSize: '14px', color: '#8fe3c0' }).setOrigin(0.5)

    SLOT_POS.forEach((pos, i) => {
      const rect = this.add.rectangle(pos.x, pos.y, 64, 64, 0x1e293b, 0.6)
      rect.setStrokeStyle(2, 0x475569)
      rect.setInteractive({ useHandCursor: true })
      rect.on('pointerdown', () => this.onSlotClick(i))
      this.slotGfx.push(rect)
    })

    this.registerBusHandler('hire', () => this.hireRandomEmployee())
    this.registerBusHandler('select-employee', (uid: string) => {
      this.selectedUid = this.selectedUid === uid ? null : uid
      this.redrawSlotHighlights()
      this.emitState()
    })
    this.registerBusHandler('promote-all', () => {
      while (this.mergeOnce()) {
        /* 병합 가능한 만큼 반복 */
      }
      this.redrawAllSlots()
      this.emitState()
    })
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
    for (const e of this.enemies) e.container.destroy()
    this.enemies = []
    this.redrawAllSlots()
    this.emitState()
  }

  private genId() {
    this.idCounter += 1
    return `emp-${this.idCounter}`
  }

  private hireRandomEmployee() {
    if (this.gameOver || this.gold < HIRE_COST) return
    this.gold -= HIRE_COST
    const job = Phaser.Utils.Array.GetRandom(JOB_LIST)
    const rarity = pickWeighted(RARITY_LIST, (r) => r.hireWeight)
    const emp: Employee = { uid: this.genId(), jobId: job.id, rarity: rarity.id, level: 1, slotIndex: null }
    this.employees.push(emp)
    this.emitState()
  }

  private mergeOnce(): boolean {
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
        return true
      }
    }
    return false
  }

  private onSlotClick(slotIndex: number) {
    if (this.gameOver) return
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
    const rarity = RARITIES[emp.rarity]
    const levelMult = 1 + (emp.level - 1) * LEVEL_STAT_GROWTH
    let atk = job.baseAttack * rarity.statMult * levelMult
    let atkSpeed = job.baseAttackSpeed * levelMult

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
      const occupied = this.employees.some((e) => e.slotIndex === i)
      const rect = this.slotGfx[i]
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

    for (const emp of this.employees) {
      if (emp.slotIndex === null) continue
      const pos = SLOT_POS[emp.slotIndex]
      const job = JOBS[emp.jobId]
      const rarity = RARITIES[emp.rarity]

      const container = this.add.container(pos.x, pos.y)
      const bg = this.add.rectangle(0, 0, 60, 60, job.color, 0.25)
      bg.setStrokeStyle(3, rarity.color)
      const icon = this.add.text(0, -6, job.icon, { fontSize: '26px' }).setOrigin(0.5)
      const lvl = this.add.text(0, 20, `Lv.${emp.level}`, { fontSize: '11px', color: '#e2e8f0' }).setOrigin(0.5)
      container.add([bg, icon, lvl])
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

    const container = this.add.container(SPAWN_X, PATH_Y)
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
      x: SPAWN_X,
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
    }

    // 적 이동
    for (const enemy of [...this.enemies]) {
      enemy.x += (enemy.speed * dt) / 1000
      enemy.container.x = enemy.x
      if (enemy.x >= BASE_X) {
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
        let bestX = -Infinity
        for (const enemy of this.enemies) {
          const dist = Phaser.Math.Distance.Between(pos.x, pos.y, enemy.x, PATH_Y)
          if (dist <= stats.range && enemy.x > bestX) {
            bestX = enemy.x
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
      activeSynergyIds: this.activeSynergyIds(),
      waveIntermission: this.waveIntermission,
      selectedUid: this.selectedUid,
    }
    EventBus.emit('state-update', snapshot)
  }
}

export function jobName(id: JobId) {
  return JOBS[id].name
}

export const FIELD_SIZE = { width: FIELD_W, height: FIELD_H }
