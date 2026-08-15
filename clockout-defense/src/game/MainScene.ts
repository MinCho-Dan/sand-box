import Phaser from 'phaser'
import { EventBus } from './EventBus'
import {
  JOBS,
  JOB_LIST,
  RARITIES,
  RARITY_LIST,
  HIRE_COST,
  upgradeCost,
  LEVEL_CAP,
  MAX_RARITY,
} from '../data/employees'
import { waveComposition, waveHpMult, waveSpeedMult } from '../data/enemies'
import { SYNERGIES } from '../data/synergies'
import { baseAttack, baseAttackSpeed } from '../stats'
import type { Employee, EnemyDef, GameSnapshot, JobId, Rarity } from '../types'

// 세로형(모바일 우선) 필드. 업무는 ㄹ자로 왔다갔다 하며 아래로 내려와 하단의 회사를 위협한다.
const FIELD_W = 450
const FIELD_H = 950
const SPAWN_INTERVAL_MS = 650
const INTERMISSION_MS = 4000
const START_GOLD = 300
const START_HP = 100
const EMIT_INTERVAL_MS = 150
const PATH_BAND = 90

/** ㄹ자 경로의 꺾이는 지점들. 순서대로 지나간다. */
const PATH_POINTS = [
  { x: 70, y: -20 },
  { x: 70, y: 130 },
  { x: 380, y: 130 },
  { x: 380, y: 400 },
  { x: 70, y: 400 },
  { x: 70, y: 670 },
  { x: 380, y: 670 },
  { x: 380, y: 860 },
]

interface PathSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  length: number
}

const PATH_SEGMENTS: PathSegment[] = PATH_POINTS.slice(1).map((p, i) => {
  const prev = PATH_POINTS[i]
  return { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, length: Phaser.Math.Distance.Between(prev.x, prev.y, p.x, p.y) }
})
const TOTAL_PATH_LENGTH = PATH_SEGMENTS.reduce((sum, seg) => sum + seg.length, 0)
const BASE_POS = PATH_POINTS[PATH_POINTS.length - 1]

function pointAtDistance(dist: number): { x: number; y: number; arrived: boolean } {
  if (dist >= TOTAL_PATH_LENGTH) {
    return { x: BASE_POS.x, y: BASE_POS.y, arrived: true }
  }
  let remaining = dist
  for (const seg of PATH_SEGMENTS) {
    if (remaining <= seg.length) {
      const t = seg.length === 0 ? 0 : remaining / seg.length
      return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t, arrived: false }
    }
    remaining -= seg.length
  }
  return { x: BASE_POS.x, y: BASE_POS.y, arrived: true }
}

// 레인 사이 여유 공간에 슬롯을 배치한다. 경로가 지나가는 대역(±45)은 피한다.
const SLOT_POS = [
  { x: 160, y: 45 },
  { x: 255, y: 45 },
  { x: 350, y: 45 },
  { x: 100, y: 265 },
  { x: 195, y: 265 },
  { x: 290, y: 265 },
  { x: 160, y: 535 },
  { x: 255, y: 535 },
  { x: 350, y: 535 },
  { x: 100, y: 790 },
  { x: 195, y: 790 },
  { x: 290, y: 790 },
]

/** 각 슬롯이 열리는 최소 웨이브(0-index). 0 은 시작부터 열려 있다는 뜻. */
const SLOT_UNLOCK_WAVE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 11]

interface RuntimeEnemy {
  uid: string
  def: EnemyDef
  hp: number
  maxHp: number
  speed: number
  traveled: number
  x: number
  y: number
  container: Phaser.GameObjects.Container
  circle: Phaser.GameObjects.Arc
  hpFg: Phaser.GameObjects.Rectangle
}

function pickWeighted<T extends { hireWeight: number }>(list: T[], weight: (item: T) => number): T {
  const total = list.reduce((sum, item) => sum + weight(item), 0)
  let r = Math.random() * total
  for (const item of list) {
    r -= weight(item)
    if (r <= 0) return item
  }
  return list[list.length - 1]
}

export class MainScene extends Phaser.Scene {
  /** 인덱스 = 슬롯 번호. 대기 명단이 따로 없다 — 채용은 곧 배치다. */
  private slots: (Employee | null)[] = new Array(SLOT_POS.length).fill(null)
  private gold = START_GOLD
  private hp = START_HP
  private wave = 0
  private score = 0
  private speedMult: 1 | 2 | 3 = 1
  private gameOver = false
  private waveIntermission = true
  private intermissionTimer = 1500
  /** 랜덤 채용에서 나올 수 있는 최고 등급. 티어업 합체로만 올라간다. */
  private maxUnlockedTier: Rarity = 1
  private spawnQueue: EnemyDef[] = []
  private spawnTimer = 0
  private enemies: RuntimeEnemy[] = []
  private cooldowns = new Map<string, number>()
  private idCounter = 0
  private emitAccumulator = 0
  private playTimeMs = 0
  private upgradeSeq = 0
  private lastUpgradeText = ''

  private slotGfx: Phaser.GameObjects.Rectangle[] = []
  private slotLockGfx: Phaser.GameObjects.Container[] = []
  private slotHireHint: Phaser.GameObjects.Text[] = []
  private slotContent = new Map<number, Phaser.GameObjects.Container>()

  private boundHandlers: Array<[string, (...args: never[]) => void]> = []

  constructor() {
    super('main')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')

    // ㄹ자 이동 경로
    for (const seg of PATH_SEGMENTS) {
      const midX = (seg.x1 + seg.x2) / 2
      const midY = (seg.y1 + seg.y2) / 2
      if (seg.y1 === seg.y2) {
        this.add.rectangle(midX, midY, Math.abs(seg.x2 - seg.x1) + PATH_BAND, PATH_BAND, 0x1e293b)
      } else {
        this.add.rectangle(midX, midY, PATH_BAND, Math.abs(seg.y2 - seg.y1) + PATH_BAND, 0x1e293b)
      }
    }

    // 회사(기지)
    this.add.rectangle(BASE_POS.x, BASE_POS.y + 25, 140, 40, 0x8fe3c0).setAlpha(0.85)
    this.add.text(BASE_POS.x, BASE_POS.y - 15, '회사', { fontSize: '14px', color: '#8fe3c0' }).setOrigin(0.5)

    SLOT_POS.forEach((pos, i) => {
      const rect = this.add.rectangle(pos.x, pos.y, 64, 64, 0x1e293b, 0.6)
      rect.setStrokeStyle(2, 0x475569)
      rect.setInteractive({ useHandCursor: true })
      rect.on('pointerdown', () => this.onSlotClick(i))
      this.slotGfx.push(rect)

      const hint = this.add
        .text(pos.x, pos.y, `+${HIRE_COST}G`, { fontSize: '11px', color: '#64748b' })
        .setOrigin(0.5)
      this.slotHireHint.push(hint)

      const lockContainer = this.add.container(pos.x, pos.y)
      const lockIcon = this.add.text(0, -8, '🔒', { fontSize: '18px' }).setOrigin(0.5)
      const lockLabel = this.add
        .text(0, 14, `Wave ${SLOT_UNLOCK_WAVE[i] + 1}`, { fontSize: '10px', color: '#64748b' })
        .setOrigin(0.5)
      lockContainer.add([lockIcon, lockLabel])
      this.slotLockGfx.push(lockContainer)
    })
    this.refreshSlotLocks()

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
    this.slots = new Array(SLOT_POS.length).fill(null)
    this.gold = START_GOLD
    this.hp = START_HP
    this.wave = 0
    this.score = 0
    this.maxUnlockedTier = 1
    this.gameOver = false
    this.waveIntermission = true
    this.intermissionTimer = 1500
    this.spawnQueue = []
    this.cooldowns.clear()
    this.playTimeMs = 0
    this.upgradeSeq = 0
    this.lastUpgradeText = ''
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

  /** slotIndex 와 같은 직무·등급·레벨(=`LEVEL_CAP`) 직원이 있는 다른 슬롯을 찾는다. */
  private findMergePartner(slotIndex: number): number {
    const current = this.slots[slotIndex]
    if (!current || current.level !== LEVEL_CAP) return -1
    return this.slots.findIndex(
      (e, i) => i !== slotIndex && e !== null && e.jobId === current.jobId && e.rarity === current.rarity && e.level === LEVEL_CAP,
    )
  }

  /**
   * 빈 슬롯 클릭 = 랜덤 채용해 그 자리에 배치.
   * 레벨이 남은 슬롯 클릭 = 골드로 강화(레벨+1).
   * 레벨이 꽉 찬(=LEVEL_CAP) 슬롯 클릭 = 동일 직무·등급·레벨의 다른 슬롯을 찾아 있으면
   * 그 슬롯을 비우고, 여기에 한 단계 위 등급의 랜덤 직무 Lv.1 직원을 만든다(티어업).
   */
  private onSlotClick(slotIndex: number) {
    if (this.gameOver || !this.isSlotUnlocked(slotIndex)) return
    const current = this.slots[slotIndex]

    if (!current) {
      if (this.gold < HIRE_COST) return
      this.gold -= HIRE_COST
      const job = Phaser.Utils.Array.GetRandom(JOB_LIST)
      const pool = RARITY_LIST.slice(0, this.maxUnlockedTier)
      const rarity = pickWeighted(pool, (r) => r.hireWeight)
      this.slots[slotIndex] = { uid: this.genId(), jobId: job.id, rarity: rarity.tier, level: 1 }
    } else if (current.level < LEVEL_CAP) {
      const cost = upgradeCost(current.level)
      if (this.gold < cost) return
      this.gold -= cost
      current.level += 1
      this.lastUpgradeText = `${JOBS[current.jobId].name} Lv.${current.level}로 강화!`
      this.upgradeSeq += 1
    } else {
      if (current.rarity >= MAX_RARITY) return
      const partnerIndex = this.findMergePartner(slotIndex)
      if (partnerIndex === -1) return
      const nextTier = (current.rarity + 1) as Rarity
      this.slots[partnerIndex] = null
      const newJob = Phaser.Utils.Array.GetRandom(JOB_LIST)
      this.slots[slotIndex] = { uid: this.genId(), jobId: newJob.id, rarity: nextTier, level: 1 }
      if (nextTier > this.maxUnlockedTier) this.maxUnlockedTier = nextTier
      this.lastUpgradeText = `⭐ ${RARITIES[nextTier].name} 등급 직원 획득! (랜뽑에도 등장)`
      this.upgradeSeq += 1
    }

    this.redrawAllSlots()
    this.emitState()
  }

  private activeSynergyIds(): string[] {
    const placedJobs = new Set(this.slots.filter((e): e is Employee => e !== null).map((e) => e.jobId))
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
      rect.setStrokeStyle(2, unlocked ? 0x475569 : 0x334155)
      this.slotLockGfx[i].setVisible(!unlocked)
      if (unlocked) rect.setInteractive({ useHandCursor: true })
      else rect.disableInteractive()
    })
    this.refreshHireHints()
  }

  private refreshHireHints() {
    SLOT_POS.forEach((_, i) => {
      this.slotHireHint[i].setVisible(this.isSlotUnlocked(i) && this.slots[i] === null)
    })
  }

  private redrawAllSlots() {
    for (const c of this.slotContent.values()) c.destroy()
    this.slotContent.clear()

    const activeIds = this.activeSynergyIds()

    this.slots.forEach((emp, i) => {
      if (!emp) return
      const pos = SLOT_POS[i]
      const job = JOBS[emp.jobId]
      const rarity = RARITIES[emp.rarity]
      const stats = this.effectiveStats(emp, activeIds)

      let hintText: string
      let hintColor: string
      if (emp.level < LEVEL_CAP) {
        hintText = `🔧 ${upgradeCost(emp.level)}G`
        hintColor = '#fbbf24'
      } else if (emp.rarity >= MAX_RARITY) {
        hintText = 'MAX'
        hintColor = '#64748b'
      } else if (this.findMergePartner(i) !== -1) {
        hintText = '⭐ 합체 가능'
        hintColor = '#facc15'
      } else {
        hintText = 'Lv.MAX'
        hintColor = '#64748b'
      }

      const container = this.add.container(pos.x, pos.y)
      const bg = this.add.rectangle(0, 0, 60, 60, job.color, 0.25)
      bg.setStrokeStyle(3, rarity.color)
      const icon = this.add.text(0, -14, job.icon, { fontSize: '22px' }).setOrigin(0.5)
      const lvl = this.add.text(0, 10, `Lv.${emp.level}`, { fontSize: '10px', color: '#e2e8f0' }).setOrigin(0.5)
      const atkTxt = this.add
        .text(0, 22, `ATK ${Math.round(stats.atk)}`, { fontSize: '9px', color: '#94a3b8' })
        .setOrigin(0.5)
      const hintTxt = this.add.text(0, 40, hintText, { fontSize: '9px', color: hintColor }).setOrigin(0.5)
      container.add([bg, icon, lvl, atkTxt, hintTxt])
      container.setSize(60, 60)
      container.setInteractive({ useHandCursor: true })
      container.on('pointerdown', (_p: unknown, _lx: number, _ly: number, event: { stopPropagation: () => void }) => {
        event.stopPropagation()
        this.onSlotClick(i)
      })
      this.slotContent.set(i, container)
    })
    this.refreshHireHints()
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
    const start = PATH_POINTS[0]

    const container = this.add.container(start.x, start.y)
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
      traveled: 0,
      x: start.x,
      y: start.y,
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

    // 웨이브/스폰 진행 — 첫 웨이브는 직원을 하나도 배치하기 전까진 시작하지 않는다.
    const waitingForFirstHire = this.wave === 0 && this.slots.every((e) => e === null)
    if (this.waveIntermission) {
      if (!waitingForFirstHire) {
        this.intermissionTimer -= dt
        if (this.intermissionTimer <= 0) this.startWave()
      }
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

    // 적 이동 (ㄹ자 경로를 따라 진행도만큼 이동)
    for (const enemy of [...this.enemies]) {
      enemy.traveled += (enemy.speed * dt) / 1000
      const pos = pointAtDistance(enemy.traveled)
      enemy.x = pos.x
      enemy.y = pos.y
      enemy.container.x = pos.x
      enemy.container.y = pos.y
      if (pos.arrived) {
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
      this.slots.forEach((emp, i) => {
        if (!emp) return
        const cd = (this.cooldowns.get(emp.uid) ?? 0) - dt
        if (cd > 0) {
          this.cooldowns.set(emp.uid, cd)
          return
        }
        const pos = SLOT_POS[i]
        const stats = this.effectiveStats(emp, activeIds)
        let target: RuntimeEnemy | null = null
        let bestProgress = -Infinity
        for (const enemy of this.enemies) {
          const dist = Phaser.Math.Distance.Between(pos.x, pos.y, enemy.x, enemy.y)
          if (dist <= stats.range && enemy.traveled > bestProgress) {
            bestProgress = enemy.traveled
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
      })
    }

    this.emitAccumulator += delta
    if (this.emitAccumulator >= EMIT_INTERVAL_MS || this.gameOver) {
      this.emitAccumulator = 0
      this.emitState()
    }
  }

  private emitState() {
    const waitingForFirstHire = this.wave === 0 && this.slots.every((e) => e === null)
    const snapshot: GameSnapshot = {
      hp: this.hp,
      maxHp: START_HP,
      gold: Math.round(this.gold),
      wave: this.wave + 1,
      score: Math.round(this.score),
      speed: this.speedMult,
      gameOver: this.gameOver,
      slots: this.slots.map((e) => (e ? { ...e } : null)),
      slotCount: SLOT_POS.length,
      unlockedSlotCount: this.unlockedSlotIndices().length,
      nextSlotUnlockWave: this.nextSlotUnlockWaveDisplay(),
      activeSynergyIds: this.activeSynergyIds(),
      waveIntermission: this.waveIntermission,
      waitingForFirstHire,
      intermissionSecondsLeft: this.waveIntermission ? Math.max(0, Math.ceil(this.intermissionTimer / 1000)) : 0,
      playTimeSeconds: Math.floor(this.playTimeMs / 1000),
      upgradeSeq: this.upgradeSeq,
      lastUpgradeText: this.lastUpgradeText,
    }
    EventBus.emit('state-update', snapshot)
  }
}

export function jobName(id: JobId) {
  return JOBS[id].name
}

export const FIELD_SIZE = { width: FIELD_W, height: FIELD_H }
