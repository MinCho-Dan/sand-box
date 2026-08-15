import { JOBS, RARITIES } from '../data/employees'
import { EventBus } from '../game/EventBus'
import type { Employee } from '../types'

interface Props {
  employees: Employee[]
  selectedUid: string | null
}

export default function InventoryPanel({ employees, selectedUid }: Props) {
  const waiting = employees.filter((e) => e.slotIndex === null)

  return (
    <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-2 text-xs text-slate-400">
        대기 중인 직원 ({waiting.length}) — 카드를 누르고 필드의 빈 슬롯을 눌러 배치하세요
      </div>
      {waiting.length === 0 ? (
        <div className="py-3 text-center text-xs text-slate-600">채용된 직원이 없습니다</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {waiting.map((emp) => {
            const job = JOBS[emp.jobId]
            const rarity = RARITIES[emp.rarity]
            const selected = emp.uid === selectedUid
            return (
              <button
                key={emp.uid}
                onClick={() => EventBus.emit('select-employee', emp.uid)}
                style={{ borderColor: selected ? '#fde047' : `#${rarity.color.toString(16).padStart(6, '0')}` }}
                className={`flex w-20 flex-col items-center gap-1 rounded-md border-2 bg-slate-800/80 px-2 py-2 text-center transition ${
                  selected ? 'ring-2 ring-amber-300' : ''
                }`}
              >
                <span className="text-xl">{job.icon}</span>
                <span className="text-[11px] leading-tight text-slate-100">{job.name}</span>
                <span className="text-[10px] text-slate-400">
                  {rarity.name} · Lv.{emp.level}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
