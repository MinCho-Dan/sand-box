import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene, FIELD_SIZE } from './MainScene'

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: FIELD_SIZE.width,
      height: FIELD_SIZE.height,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [MainScene],
      backgroundColor: '#0f172a',
    })

    // 마운트 시점에 부모 요소의 CSS(aspect-ratio) 레이아웃이 아직 안 잡혀 있으면
    // Phaser 가 0x0 크기로 캔버스를 굳혀버린다. 실제 크기가 잡히는 순간 다시 맞춘다.
    const ro = new ResizeObserver(() => game.scale.refresh())
    ro.observe(container)

    if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game

    return () => {
      ro.disconnect()
      game.destroy(true)
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
