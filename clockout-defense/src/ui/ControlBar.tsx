import { EventBus } from '../game/EventBus'

interface Props {
  speed: 1 | 2 | 3
  waveIntermission: boolean
  gameOver: boolean
  onOpenInfo: () => void
}

export default function ControlBar({ speed, waveIntermission, gameOver, onOpenInfo }: Props) {
  return (
    <div className="flex w-full flex-col gap-1.5 border-t border-slate-800 bg-slate-900/60 px-2 py-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => EventBus.emit('skip-intermission')}
          disabled={gameOver || !waveIntermission}
          className="rounded-md bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          즉시 Wave
        </button>
        <button
          onClick={onOpenInfo}
          className="rounded-md bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-600"
        >
          ⓘ 직무 안내
        </button>
      </div>
      <div className="flex justify-center overflow-hidden rounded-md border border-slate-700">
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
