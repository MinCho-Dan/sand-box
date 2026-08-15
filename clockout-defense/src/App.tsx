import { useEffect, useState } from 'react'
import PhaserGame from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import type { GameSnapshot } from './types'
import Hud from './ui/Hud'
import ControlBar from './ui/ControlBar'
import InventoryPanel from './ui/InventoryPanel'
import SynergyPanel from './ui/SynergyPanel'
import GameOverOverlay from './ui/GameOverOverlay'

export default function App() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)

  useEffect(() => {
    const onUpdate = (s: GameSnapshot) => setSnapshot(s)
    EventBus.on('state-update', onUpdate)
    return () => {
      EventBus.off('state-update', onUpdate)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-slate-950 p-4 text-slate-100">
      <header className="text-center">
        <h1 className="text-xl font-bold text-emerald-300">퇴근까지 버텨라</h1>
        <p className="text-xs text-slate-500">직원을 배치해 밀려오는 업무를 처리하고, 무사히 퇴근하세요.</p>
      </header>

      {snapshot && (
        <Hud hp={snapshot.hp} maxHp={snapshot.maxHp} gold={snapshot.gold} wave={snapshot.wave} score={snapshot.score} />
      )}

      <div className="relative w-full max-w-3xl">
        <PhaserGame />
        {snapshot?.gameOver && <GameOverOverlay wave={snapshot.wave} score={snapshot.score} />}
      </div>

      {snapshot && (
        <>
          <ControlBar gold={snapshot.gold} speed={snapshot.speed} waveIntermission={snapshot.waveIntermission} />
          <SynergyPanel activeSynergyIds={snapshot.activeSynergyIds} />
          <InventoryPanel employees={snapshot.employees} selectedUid={snapshot.selectedUid} />
        </>
      )}
    </div>
  )
}
