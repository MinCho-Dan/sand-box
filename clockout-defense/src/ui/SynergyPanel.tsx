import { SYNERGIES } from '../data/synergies'
import { JOBS } from '../data/employees'

interface Props {
  activeSynergyIds: string[]
}

export default function SynergyPanel({ activeSynergyIds }: Props) {
  return (
    <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-2 text-xs text-slate-400">조직 시너지</div>
      <div className="flex flex-col gap-2">
        {SYNERGIES.map((syn) => {
          const active = activeSynergyIds.includes(syn.id)
          return (
            <div
              key={syn.id}
              className={`rounded-md border px-3 py-2 text-xs transition ${
                active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {active ? '✓ ' : ''}
                  {syn.name}
                </span>
                <span className="text-[10px]">{syn.requiredJobs.map((j) => JOBS[j].icon).join(' + ')}</span>
              </div>
              <div className="mt-0.5">{syn.description}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
