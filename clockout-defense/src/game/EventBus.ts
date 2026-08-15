import Phaser from 'phaser'

/** React ↔ Phaser 통신 전용 이벤트 버스. 게임 상태의 단일 소스는 MainScene 이고,
 * React 는 'state-update' 를 구독해 HUD 를 그리고, 액션은 이벤트로 씬에 보낸다. */
export const EventBus = new Phaser.Events.EventEmitter()
