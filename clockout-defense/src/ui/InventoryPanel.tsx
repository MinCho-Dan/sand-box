import { JOBS, RARITIES } from '../data/employees'
import { EventBus } from '../game/EventBus'
import { basePower } from '../stats'
import type { Employee } from '../types'

interface Props {
  employees: Employee[]
  selectedUid: string | null
  onOpenInfo: () => void
}

export default function InventoryPanel({ employees, selectedUid, onOpenInfo }: Props) {
  const waiting = employees.filter((e) => e.slotIndex === null)

  return (
    <div className="flex w-full items-center gap-2 border-t border-slate-800 bg-slate-900/80 px-2 py-2">
      <button
        onClick={onOpenInfo}
        aria-label="직무 안내"
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400 hover:text-slate-200"
      >
        ⓘ
      </button>
      {waiting.length === 0 ? (
        <div className="flex-1 text-center text-[11px] text-slate-600">채용된 직원이 없습니다</div>
      ) : (
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {waiting.map((emp) => {
            const job = JOBS[emp.jobId]
            const rarity = RARITIES[emp.rarity]
            const selected = emp.uid === selectedUid
            return (
              <button
                key={emp.uid}
                onClick={() => EventBus.emit('select-employee', emp.uid)}
                style={{ borderColor: selected ? '#fde047' : `#${rarity.color.toString(16).padStart(6, '0')}` }}
                className={`flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-md border-2 bg-slate-800/80 py-1 text-center transition ${
                  selected ? 'ring-2 ring-amber-300' : ''
                }`}
              >
                <span className="text-lg">{job.icon}</span>
                <span className="text-[10px] leading-tight text-slate-100">{job.name}</span>
                <span className="text-[9px] text-slate-400">
                  {rarity.name[0]} · Lv.{emp.level}
                </span>
                <span className="text-[9px] font-semibold text-emerald-300">DPS {Math.round(basePower(emp))}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
