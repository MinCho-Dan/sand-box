import { EventBus } from '../game/EventBus'

interface Props {
  wave: number
  score: number
}

export default function GameOverOverlay({ wave, score }: Props) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-950/90 text-center">
      <div className="text-2xl font-bold text-red-400">야근 확정</div>
      <div className="text-sm text-slate-300">
        도달 Wave <span className="font-semibold text-emerald-300">{wave}</span> · Score{' '}
        <span className="font-semibold">{score.toLocaleString()}</span>
      </div>
      <button
        onClick={() => EventBus.emit('restart')}
        className="mt-2 rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        다시 출근하기
      </button>
    </div>
  )
}
