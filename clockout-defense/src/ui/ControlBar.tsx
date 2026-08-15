import { HIRE_COST } from '../data/employees'
import { EventBus } from '../game/EventBus'

interface Props {
  gold: number
  speed: 1 | 2 | 3
  waveIntermission: boolean
}

export default function ControlBar({ gold, speed, waveIntermission }: Props) {
  const canHire = gold >= HIRE_COST

  return (
    <div className="flex w-full max-w-3xl flex-wrap items-center gap-2">
      <button
        onClick={() => EventBus.emit('hire')}
        disabled={!canHire}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        랜덤 채용 ({HIRE_COST}G)
      </button>
      <button
        onClick={() => EventBus.emit('promote-all')}
        className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-600"
      >
        일괄 승진
      </button>
      <button
        onClick={() => EventBus.emit('skip-intermission')}
        disabled={!waveIntermission}
        className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        즉시 다음 Wave
      </button>
      <div className="ml-auto flex overflow-hidden rounded-md border border-slate-700">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => EventBus.emit('set-speed', n)}
            className={`px-3 py-2 text-sm font-semibold transition ${
              speed === n ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {n}x
          </button>
        ))}
      </div>
    </div>
  )
}
