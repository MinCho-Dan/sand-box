import { SYNERGIES } from '../data/synergies'
import { JOBS } from '../data/employees'
import type { SynergyDef } from '../types'

interface Props {
  activeSynergyIds: string[]
  onSelect: (syn: SynergyDef) => void
}

export default function SynergyPanel({ activeSynergyIds, onSelect }: Props) {
  return (
    <div className="flex w-full items-center gap-1.5 overflow-x-auto border-t border-slate-800 bg-slate-900/60 px-2 py-1.5">
      {SYNERGIES.map((syn) => {
        const active = activeSynergyIds.includes(syn.id)
        return (
          <button
            key={syn.id}
            onClick={() => onSelect(syn)}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] transition ${
              active
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-800 text-slate-500'
            }`}
          >
            {active ? '✓ ' : ''}
            {syn.requiredJobs.map((j) => JOBS[j].icon).join('')} {syn.name}
          </button>
        )
      })}
    </div>
  )
}
