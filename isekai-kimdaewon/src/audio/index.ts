import { loadAudioMode, saveAudioMode } from "../core/save";

/** 0 = 음악+효과음, 1 = 효과음만, 2 = 음소거 */
let audioMode = loadAudioMode();

export const AUDIO_LABEL = ["소리 켜짐", "효과음만", "소리 꺼짐"];
export const getAudioMode = () => audioMode;
export const sfxOn = () => audioMode !== 2;
export const bgmOn = () => audioMode === 0;

let actx: AudioContext | null = null;
let bgmGain: GainNode | null = null;

function audioCtx(): AudioContext | null {
  if (audioMode === 2) return null;
  if (!actx) {
    const AC = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!AC) return null;
    try {
      actx = new AC();
    } catch {
      return null;
    }
    try {
      bgmGain = actx!.createGain();
      bgmGain.gain.value = 1;
      bgmGain.connect(actx!.destination);
    } catch {
      bgmGain = null;
    }
  }
  if (actx && actx.state === "suspended") {
    try {
      void actx.resume();
    } catch {
      /* 사용자 제스처 전에는 실패할 수 있다 */
    }
  }
  return actx;
}

/** 모바일은 사용자 제스처가 있어야 오디오가 열린다 */
export const wakeAudio = () => void audioCtx();

export function cycleAudio(): void {
  audioMode = (audioMode + 1) % 3;
  saveAudioMode(audioMode);
  if (!bgmOn()) bgm.step = 0;
  if (sfxOn()) sfx("ui");
}

/* ── 효과음 ── */
interface ToneOpts {
  freq: number;
  freq2?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  delay?: number;
}

function tone(o: ToneOpts): void {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.12;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = o.type ?? "square";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freq2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.15, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(o: { dur?: number; vol?: number; delay?: number; filt?: number }): void {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.15;
  const n = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = o.filt ?? 1200;
  const g = ac.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.15, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export const SFX: Record<string, () => void> = {
  swing: () => noise({ dur: 0.09, vol: 0.09, filt: 2800 }),
  hit: () => tone({ freq: 240, freq2: 90, dur: 0.07, vol: 0.15 }),
  kill: () => {
    tone({ freq: 180, freq2: 50, dur: 0.16, vol: 0.15 });
    noise({ dur: 0.14, vol: 0.11, filt: 900 });
  },
  hurt: () => tone({ freq: 200, freq2: 60, type: "sawtooth", dur: 0.26, vol: 0.2 }),
  dash: () => noise({ dur: 0.16, vol: 0.11, filt: 1700 }),
  parry: () => {
    tone({ freq: 1500, freq2: 950, dur: 0.09, vol: 0.13 });
    tone({ freq: 2200, dur: 0.05, vol: 0.07, delay: 0.02 });
  },
  food: () => {
    tone({ freq: 620, dur: 0.07, vol: 0.13, type: "triangle" });
    tone({ freq: 930, dur: 0.09, vol: 0.12, type: "triangle", delay: 0.06 });
  },
  gem: () => {
    tone({ freq: 1250, dur: 0.05, vol: 0.08, type: "triangle" });
    tone({ freq: 1650, dur: 0.06, vol: 0.07, type: "triangle", delay: 0.04 });
  },
  clear: () =>
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.17, vol: 0.12, type: "triangle", delay: i * 0.09 })),
  buy: () => {
    tone({ freq: 700, dur: 0.06, vol: 0.12 });
    tone({ freq: 1050, dur: 0.09, vol: 0.11, delay: 0.05 });
  },
  ui: () => tone({ freq: 520, dur: 0.05, vol: 0.09 }),
  tool: () => {
    noise({ dur: 0.11, vol: 0.1, filt: 3400 });
    tone({ freq: 820, freq2: 1150, dur: 0.08, vol: 0.07, type: "sawtooth" });
  },
  batt: () => {
    tone({ freq: 880, dur: 0.06, vol: 0.11 });
    tone({ freq: 1320, dur: 0.08, vol: 0.1, delay: 0.05 });
  },
  empty: () => {
    tone({ freq: 420, freq2: 110, dur: 0.35, vol: 0.15, type: "sawtooth" });
    noise({ dur: 0.2, vol: 0.08, filt: 700 });
  },
  charge: () => tone({ freq: 120, freq2: 420, type: "sawtooth", dur: 0.55, vol: 0.09 }),
  boss: () => {
    [880, 740, 590, 440, 300].forEach((f, i) => tone({ freq: f, dur: 0.3, vol: 0.15, delay: i * 0.13 }));
    noise({ dur: 0.9, vol: 0.14, filt: 600 });
  },
  over: () => tone({ freq: 300, freq2: 70, type: "sawtooth", dur: 0.9, vol: 0.18 }),
};

export function sfx(k: string): void {
  if (!sfxOn()) return;
  const f = SFX[k];
  if (!f) return;
  try {
    f();
  } catch {
    /* 오디오 실패가 게임을 멈추게 하지 않는다 */
  }
}

/* ── 배경음악 ──────────────────────────────────────────────
   16스텝 시퀀서. 오디오 파일 없이 베이스 + 리드 두 성부를 합성한다.
   메인 루프에서 호출되므로 탭이 백그라운드로 가면 자연히 멈춘다. */
export type Mood = "menu" | "play" | "boss";

export const bgm = { next: 0, step: 0, mood: "" as Mood | "" };

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const ROOT = 57; // A3

interface Pattern {
  bpm: number;
  bassVol: number;
  leadVol: number;
  lead: OscillatorType;
  bass: (number | null)[];
  mel: (number | null)[];
}

export const BGM_PATTERNS: Record<Mood, Pattern> = {
  menu: {
    bpm: 76, bassVol: 0.05, leadVol: 0.03, lead: "triangle",
    bass: [0, null, null, null, null, null, null, null, -4, null, null, null, null, null, null, null],
    mel: [12, null, 15, null, 19, null, 15, null, 17, null, 20, null, 15, null, 12, null],
  },
  play: {
    bpm: 138, bassVol: 0.055, leadVol: 0.032, lead: "square",
    bass: [0, null, 0, null, -4, null, -4, null, -7, null, -7, null, -2, null, -2, null],
    mel: [12, 15, 19, 15, 8, 12, 15, 12, 5, 8, 12, 8, 10, 14, 17, 14],
  },
  boss: {
    bpm: 158, bassVol: 0.06, leadVol: 0.034, lead: "sawtooth",
    bass: [0, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, -3, -3, -3, -3],
    mel: [12, 13, 12, 11, 12, 15, 12, 18, 12, 13, 12, 11, 15, 18, 22, 18],
  },
};

function bgmNote(semi: number, dur: number, vol: number, type: OscillatorType, at: number): void {
  const ac = actx;
  if (!ac || !bgmGain) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(NOTE(semi), at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g);
  g.connect(bgmGain);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** 0.25초 앞을 미리 예약한다 */
export function bgmTick(mood: Mood): void {
  if (!bgmOn()) return;
  const ac = audioCtx();
  if (!ac || ac.state !== "running") return;

  if (mood !== bgm.mood) {
    bgm.mood = mood;
    bgm.step = 0;
    bgm.next = ac.currentTime + 0.05;
  }
  if (bgm.next < ac.currentTime) bgm.next = ac.currentTime + 0.05;

  const p = BGM_PATTERNS[mood];
  const spb = 30 / p.bpm; // 8분음표
  while (bgm.next < ac.currentTime + 0.25) {
    const s = bgm.step % 16;
    const b = p.bass[s];
    const m = p.mel[s];
    if (b !== null && b !== undefined) bgmNote(ROOT + b - 12, spb * 0.95, p.bassVol, "triangle", bgm.next);
    if (m !== null && m !== undefined) bgmNote(ROOT + m, spb * 0.65, p.leadVol, p.lead, bgm.next);
    bgm.next += spb;
    bgm.step++;
  }
}
