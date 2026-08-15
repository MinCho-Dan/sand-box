import { useEffect, useRef, useState } from 'react'
import PhaserGame from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import type { GameSnapshot, SynergyDef } from './types'
import Hud from './ui/Hud'
import ControlBar from './ui/ControlBar'
import InventoryPanel from './ui/InventoryPanel'
import SynergyPanel from './ui/SynergyPanel'
import GameOverOverlay from './ui/GameOverOverlay'
import Modal from './ui/Modal'
import JobInfoModal from './ui/JobInfoModal'

export default function App() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [promotionToast, setPromotionToast] = useState<string | null>(null)
  const [jobInfoOpen, setJobInfoOpen] = useState(false)
  const [synergyModal, setSynergyModal] = useState<SynergyDef | null>(null)
  const lastPromotionSeq = useRef(0)

  useEffect(() => {
    const onUpdate = (s: GameSnapshot) => setSnapshot(s)
    EventBus.on('state-update', onUpdate)
    return () => {
      EventBus.off('state-update', onUpdate)
    }
  }, [])

  const promotionSeq = snapshot?.promotionSeq
  const lastPromotionText = snapshot?.lastPromotionText
  useEffect(() => {
    if (promotionSeq === undefined || promotionSeq === lastPromotionSeq.current) return
    lastPromotionSeq.current = promotionSeq
    setPromotionToast(lastPromotionText ?? null)
    const timer = setTimeout(() => setPromotionToast(null), 2500)
    return () => clearTimeout(timer)
  }, [promotionSeq, lastPromotionText])

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
            intermissionSecondsLeft={snapshot.intermissionSecondsLeft}
            playTimeSeconds={snapshot.playTimeSeconds}
          />
        )}

        {snapshot && <SynergyPanel activeSynergyIds={snapshot.activeSynergyIds} onSelect={setSynergyModal} />}

        <div className="relative min-h-0 flex-1">
          <PhaserGame />
          {snapshot?.gameOver && <GameOverOverlay wave={snapshot.wave} score={snapshot.score} />}
          {promotionToast && (
            <div className="absolute inset-x-2 top-2 rounded-md border border-emerald-600 bg-slate-950/90 px-2 py-1.5 text-center text-[11px] text-emerald-200 shadow-lg">
              승진! {promotionToast}
            </div>
          )}
        </div>

        {snapshot && (
          <ControlBar
            gold={snapshot.gold}
            speed={snapshot.speed}
            waveIntermission={snapshot.waveIntermission}
            gameOver={snapshot.gameOver}
          />
        )}
        {snapshot && (
          <InventoryPanel
            employees={snapshot.employees}
            selectedUid={snapshot.selectedUid}
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
