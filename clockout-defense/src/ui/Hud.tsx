interface Props {
  hp: number
  maxHp: number
  gold: number
  wave: number
  score: number
}

export default function Hud({ hp, maxHp, gold, wave, score }: Props) {
  const hpRatio = Math.max(0, hp / maxHp)
  const hpColor = hpRatio > 0.5 ? 'bg-emerald-400' : hpRatio > 0.25 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
      <div className="flex min-w-[140px] flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>회사 HP</span>
          <span>
            {Math.round(hp)} / {maxHp}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${hpColor} transition-all`} style={{ width: `${hpRatio * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-amber-300">
        🪙 <span className="font-semibold">{gold.toLocaleString()}</span>
      </div>
      <div className="text-slate-200">
        Wave <span className="font-semibold text-emerald-300">{wave}</span>
      </div>
      <div className="text-slate-400">
        Score <span className="font-semibold text-slate-200">{score.toLocaleString()}</span>
      </div>
    </div>
  )
}
