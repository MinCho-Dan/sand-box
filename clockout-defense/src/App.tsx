import { useEffect, useRef, useState } from 'react'
import PhaserGame from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import type { GameSnapshot, SynergyDef } from './types'
import Hud from './ui/Hud'
import ControlBar from './ui/ControlBar'
import SynergyPanel from './ui/SynergyPanel'
import GameOverOverlay from './ui/GameOverOverlay'
import Modal from './ui/Modal'
import JobInfoModal from './ui/JobInfoModal'

export default function App() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [upgradeToast, setUpgradeToast] = useState<string | null>(null)
  const [jobInfoOpen, setJobInfoOpen] = useState(false)
  const [synergyModal, setSynergyModal] = useState<SynergyDef | null>(null)
  const lastUpgradeSeq = useRef(0)

  useEffect(() => {
    const onUpdate = (s: GameSnapshot) => setSnapshot(s)
    EventBus.on('state-update', onUpdate)
    return () => {
      EventBus.off('state-update', onUpdate)
    }
  }, [])

  const upgradeSeq = snapshot?.upgradeSeq
  const lastUpgradeText = snapshot?.lastUpgradeText
  useEffect(() => {
    if (upgradeSeq === undefined || upgradeSeq === lastUpgradeSeq.current) return
    lastUpgradeSeq.current = upgradeSeq
    setUpgradeToast(lastUpgradeText ?? null)
    const timer = setTimeout(() => setUpgradeToast(null), 2000)
    return () => clearTimeout(timer)
  }, [upgradeSeq, lastUpgradeText])

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto flex h-full w-full max-w-[420px] flex-col overflow-hidden">
        {snapshot && (
          <Hud
            hp={snapshot.hp}
            maxHp={snapshot.maxHp}
            gold={snapshot.gold}
            wave={snapshot.wave}
            score={snapshot.score}
            waveIntermission={snapshot.waveIntermission}
            waitingForFirstHire={snapshot.waitingForFirstHire}
            intermissionSecondsLeft={snapshot.intermissionSecondsLeft}
            playTimeSeconds={snapshot.playTimeSeconds}
          />
        )}

        {snapshot && <SynergyPanel activeSynergyIds={snapshot.activeSynergyIds} onSelect={setSynergyModal} />}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <PhaserGame />
          {snapshot?.gameOver && <GameOverOverlay wave={snapshot.wave} score={snapshot.score} />}
          {upgradeToast && (
            <div className="absolute inset-x-2 top-2 rounded-md border border-amber-500 bg-slate-950/90 px-2 py-1.5 text-center text-[11px] text-amber-200 shadow-lg">
              {upgradeToast}
            </div>
          )}
        </div>

        {snapshot && (
          <ControlBar
            speed={snapshot.speed}
            waveIntermission={snapshot.waveIntermission}
            waitingForFirstHire={snapshot.waitingForFirstHire}
            gameOver={snapshot.gameOver}
            onOpenInfo={() => setJobInfoOpen(true)}
          />
        )}
      </div>

      {jobInfoOpen && <JobInfoModal onClose={() => setJobInfoOpen(false)} />}
      {synergyModal && (
        <Modal title={synergyModal.name} onClose={() => setSynergyModal(null)}>
          <p className="text-xs text-slate-300">{synergyModal.description}</p>
        </Modal>
      )}
    </div>
  )
}
