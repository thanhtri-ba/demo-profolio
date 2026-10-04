/**
 * Trình phát nhạc cho "khu nghe nhạc": nhạc được tạo trực tiếp bằng WebAudio (step sequencer),
 * không cần file mp3 và không dính bản quyền. Có analyser để vẽ equalizer 3D.
 *
 * Muốn dùng bài của bạn: thêm `src` (URL mp3/ogg) vào TRACKS, engine sẽ phát file đó qua <audio>
 * thay vì synth, equalizer vẫn hoạt động.
 */
export type Track = {
  id: string
  title: string
  artist: string
  mood: string
  /** URL file nhạc tuỳ chọn; bỏ trống = nhạc synth sinh tại chỗ */
  src?: string
  bpm: number
  swing: number
  chords: number[][] // mỗi hợp âm kéo dài 1 ô nhịp (16 step)
  kick: string
  snare: string
  hat: string
  bass: string // 'x' = đánh nốt gốc của hợp âm
  bassWave: OscillatorType
  arp: number[] // chỉ số nốt trong hợp âm, -1 = nghỉ (16 step)
  arpWave: OscillatorType
  arpOct: number
  padCut: number
  padGain: number
  drumGain: number
  crackle: number
}

export const TRACKS: Track[] = [
  {
    id: 'neon-rain', title: 'Neon Rain', artist: 'Lo-fi · 78 BPM', mood: 'Chill',
    bpm: 78, swing: 0.14,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx',
    bass: 'x.....x.x.......', bassWave: 'sine',
    arp: [-1, 2, -1, -1, 3, -1, 1, -1, -1, 2, -1, -1, 0, -1, -1, 1], arpWave: 'triangle', arpOct: 12,
    padCut: 900, padGain: 0.09, drumGain: 0.8, crackle: 0.018,
  },
  {
    id: 'midnight-drive', title: 'Midnight Drive', artist: 'Synthwave · 100 BPM', mood: 'Energy',
    bpm: 100, swing: 0,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
    bass: 'x.xxx.xxx.xxx.xx', bassWave: 'sawtooth',
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1], arpWave: 'sawtooth', arpOct: 12,
    padCut: 1400, padGain: 0.06, drumGain: 1, crackle: 0,
  },
  {
    id: 'quiet-alley', title: 'Quiet Alley', artist: 'Ambient · 62 BPM', mood: 'Focus',
    bpm: 62, swing: 0,
    chords: [[50, 57, 60, 64], [46, 53, 57, 62], [48, 55, 59, 64], [45, 52, 57, 60]],
    kick: '................', snare: '................', hat: '..............x.',
    bass: 'x...............', bassWave: 'sine',
    arp: [-1, -1, 3, -1, -1, -1, -1, 2, -1, -1, 1, -1, -1, -1, -1, -1], arpWave: 'sine', arpOct: 24,
    padCut: 700, padGain: 0.13, drumGain: 0.35, crackle: 0.01,
  },
]

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

type Listener = () => void

class MusicEngine {
  private ctx: AudioContext | null = null
  private out!: GainNode
  private analyser!: AnalyserNode
  private noiseBuf!: AudioBuffer
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private nextTime = 0
  private audioEl: HTMLAudioElement | null = null
  private crackleSrc: AudioBufferSourceNode | null = null
  private crackleGain: GainNode | null = null
  private freq = new Uint8Array(64)
  private listeners = new Set<Listener>()

  index = 0
  private startedAt = 0
  private frozen = 0
  playing = false
  volume = 0.7
  private snap = { index: 0, playing: false, volume: 0.7 }

  get tracks() { return TRACKS }
  get track() { return TRACKS[this.index] }

  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getSnapshot = () => this.snap
  private emit() {
    this.snap = { index: this.index, playing: this.playing, volume: this.volume }
    this.listeners.forEach((l) => l())
  }

  private init() {
    if (this.ctx) return true
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return false
    const ctx = new Ctx()
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = this.volume
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 128
    this.analyser.smoothingTimeConstant = 0.78
    // echo nhẹ cho arp/pad
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.36
    const fb = ctx.createGain(); fb.gain.value = 0.32
    const wet = ctx.createGain(); wet.gain.value = 0.35
    delay.connect(fb).connect(delay)
    delay.connect(wet).connect(this.out)
    this.sendDelay = delay
    this.out.connect(this.analyser)
    this.analyser.connect(ctx.destination)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    this.noiseBuf = buf
    return true
  }
  private sendDelay!: DelayNode
  private mediaNode: MediaElementAudioSourceNode | null = null

  async play(i = this.index) {
    if (!this.init() || !this.ctx) return
    this.stopSource()
    this.index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length
    try { await this.ctx.resume() } catch { /* cần thao tác của người dùng */ }
    const t = this.track
    if (t.src) {
      const el = this.audioEl ?? (this.audioEl = new Audio())
      el.crossOrigin = 'anonymous'
      el.src = t.src
      el.loop = true
      if (!this.mediaNode) {
        this.mediaNode = this.ctx.createMediaElementSource(el)
        this.mediaNode.connect(this.out)
      }
      await el.play().catch(() => {})
    } else {
      this.step = 0
      this.nextTime = this.ctx.currentTime + 0.08
      this.startCrackle(t.crackle)
      this.timer = setInterval(() => this.schedule(), 25)
    }
    this.playing = true
    this.startedAt = this.ctx.currentTime
    this.emit()
  }

  /** Số giây đã phát của bài hiện tại (đóng băng khi tạm dừng). */
  elapsed() {
    return this.playing && this.ctx ? this.ctx.currentTime - this.startedAt : this.frozen
  }

  pause() {
    this.frozen = this.elapsed()
    this.stopSource()
    this.playing = false
    this.emit()
  }

  toggle() { this.playing ? this.pause() : void this.play() }
  next() { void this.play(this.index + 1) }
  prev() { void this.play(this.index - 1) }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    this.emit()
  }

  private stopSource() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.audioEl?.pause()
    try { this.crackleSrc?.stop() } catch { /* đã dừng */ }
    this.crackleSrc = null
  }

  private startCrackle(level: number) {
    const ctx = this.ctx
    if (!ctx || level <= 0) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500
    const g = ctx.createGain(); g.gain.value = level
    src.connect(hp).connect(g).connect(this.out)
    src.start()
    this.crackleSrc = src
    this.crackleGain = g
  }

  /** 0..1 cho n cột equalizer (0 khi không phát). */
  levels(n: number): number[] {
    const out = new Array(n).fill(0)
    if (!this.ctx || !this.playing) return out
    this.analyser.getByteFrequencyData(this.freq)
    const usable = 40 // bỏ dải siêu cao ít năng lượng
    for (let i = 0; i < n; i++) {
      const a = Math.floor((i / n) * usable), b = Math.max(a + 1, Math.floor(((i + 1) / n) * usable))
      let s = 0
      for (let k = a; k < b; k++) s += this.freq[k]
      out[i] = Math.min(1, (s / (b - a) / 255) * 1.35)
    }
    return out
  }

  // ───────────── synth + sequencer ─────────────
  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    const t = this.track
    const stepDur = 60 / t.bpm / 4
    while (this.nextTime < ctx.currentTime + 0.12) {
      const s = this.step % 16
      const bar = Math.floor(this.step / 16)
      const chord = t.chords[bar % t.chords.length]
      const when = this.nextTime + (s % 2 === 1 ? stepDur * t.swing : 0)
      if (s === 0) this.pad(chord, when, stepDur * 16, t)
      if (t.kick[s] === 'x') this.kick(when, t.drumGain)
      if (t.snare[s] === 'x') this.snare(when, t.drumGain)
      if (t.hat[s] === 'x') this.hat(when, t.drumGain * (s % 4 === 0 ? 1 : 0.6))
      if (t.bass[s] === 'x') this.bassNote(chord[0] - 12, when, stepDur * 1.6, t)
      const a = t.arp[s]
      if (a >= 0) this.pluck(chord[a % chord.length] + t.arpOct, when, stepDur * 3, t)
      this.nextTime += stepDur
      this.step++
    }
  }

  private env(g: GainNode, when: number, peak: number, attack: number, dur: number) {
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(peak, when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  }

  private pad(chord: number[], when: number, dur: number, t: Track) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = t.padCut; lp.Q.value = 0.6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(t.padGain, when + dur * 0.25)
    g.gain.linearRampToValueAtTime(t.padGain * 0.7, when + dur * 0.8)
    g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.25)
    lp.connect(g)
    g.connect(this.out)
    g.connect(this.sendDelay)
    for (const m of chord) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator()
        o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det
        o.connect(lp); o.start(when); o.stop(when + dur + 0.3)
      }
    }
  }

  private kick(when: number, level: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(140, when)
    o.frequency.exponentialRampToValueAtTime(42, when + 0.14)
    this.env(g, when, 0.9 * level, 0.004, 0.32)
    o.connect(g).connect(this.out)
    o.start(when); o.stop(when + 0.35)
  }

  private snare(when: number, level: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8
    const g = ctx.createGain()
    this.env(g, when, 0.42 * level, 0.002, 0.2)
    src.connect(bp).connect(g).connect(this.out)
    src.start(when, Math.random()); src.stop(when + 0.22)
    const o = ctx.createOscillator(); const og = ctx.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(190, when)
    this.env(og, when, 0.25 * level, 0.002, 0.1)
    o.connect(og).connect(this.out); o.start(when); o.stop(when + 0.12)
  }

  private hat(when: number, level: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000
    const g = ctx.createGain()
    this.env(g, when, 0.16 * level, 0.001, 0.05)
    src.connect(hp).connect(g).connect(this.out)
    src.start(when, Math.random()); src.stop(when + 0.06)
  }

  private bassNote(m: number, when: number, dur: number, t: Track) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); const g = ctx.createGain()
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = t.bassWave === 'sawtooth' ? 520 : 260
    o.type = t.bassWave; o.frequency.value = mtof(m)
    this.env(g, when, t.bassWave === 'sawtooth' ? 0.26 : 0.42, 0.01, dur)
    o.connect(lp).connect(g).connect(this.out)
    o.start(when); o.stop(when + dur + 0.05)
  }

  private pluck(m: number, when: number, dur: number, t: Track) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); const g = ctx.createGain()
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'
    lp.frequency.setValueAtTime(t.arpWave === 'sawtooth' ? 3200 : 2400, when)
    lp.frequency.exponentialRampToValueAtTime(500, when + dur)
    o.type = t.arpWave; o.frequency.value = mtof(m)
    this.env(g, when, t.arpWave === 'sawtooth' ? 0.1 : 0.16, 0.006, dur)
    o.connect(lp).connect(g)
    g.connect(this.out); g.connect(this.sendDelay)
    o.start(when); o.stop(when + dur + 0.05)
  }
}

export const music = new MusicEngine()
