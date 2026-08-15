interface Props {
  hp: number
  maxHp: number
  gold: number
  wave: number
  score: number
  waveIntermission: boolean
  intermissionSecondsLeft: number
  playTimeSeconds: number
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Hud({
  hp,
  maxHp,
  gold,
  wave,
  score,
  waveIntermission,
  intermissionSecondsLeft,
  playTimeSeconds,
}: Props) {
  const hpRatio = Math.max(0, hp / maxHp)
  const hpColor = hpRatio > 0.5 ? 'bg-emerald-400' : hpRatio > 0.25 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="flex w-full flex-col gap-1 bg-slate-900/80 px-2 py-1.5 text-[11px]">
      <div className="flex items-center justify-between text-emerald-300">
        <span className="font-semibold">🏢 퇴근까지 버텨라</span>
        <span className="text-slate-500">⏱ {formatTime(playTimeSeconds)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-slate-400">
          ❤️ {Math.round(hp)}/{maxHp}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${hpColor} transition-all`} style={{ width: `${hpRatio * 100}%` }} />
        </div>
        <span className="shrink-0 text-amber-300">🪙 {gold.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between text-slate-400">
        <span>
          Wave <span className="font-semibold text-emerald-300">{wave}</span>
          {waveIntermission ? (
            <span className="ml-1 text-amber-300">{intermissionSecondsLeft}초 후 시작</span>
          ) : (
            <span className="ml-1 text-slate-500">전투 중</span>
          )}
        </span>
        <span>
          Score <span className="font-semibold text-slate-200">{score.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}
