import { HIRE_COST } from '../data/employees'
import { EventBus } from '../game/EventBus'

interface Props {
  gold: number
  speed: 1 | 2 | 3
  waveIntermission: boolean
  gameOver: boolean
}

export default function ControlBar({ gold, speed, waveIntermission, gameOver }: Props) {
  const canHire = !gameOver && gold >= HIRE_COST

  return (
    <div className="grid w-full grid-cols-3 gap-1.5 border-t border-slate-800 bg-slate-900/60 px-2 py-1.5">
      <button
        onClick={() => EventBus.emit('hire')}
        disabled={!canHire}
        className="rounded-md bg-emerald-500 px-2 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        채용 {HIRE_COST}G
      </button>
      <button
        onClick={() => EventBus.emit('auto-arrange')}
        disabled={gameOver}
        className="rounded-md bg-sky-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        최적 배치
      </button>
      <button
        onClick={() => EventBus.emit('skip-intermission')}
        disabled={gameOver || !waveIntermission}
        className="rounded-md bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        즉시 Wave
      </button>
      <div className="col-span-3 flex justify-center overflow-hidden rounded-md border border-slate-700">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => EventBus.emit('set-speed', n)}
            className={`flex-1 py-1 text-xs font-semibold transition ${
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
