/**
 * Âm thanh tạo bằng WebAudio (không cần file): tiếng mưa, nhạc nền synth nhẹ,
 * tiếng "tạch" khi bấm bảng và sấm khi có sét.
 */
class Engine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private rain!: GainNode
  private muted = true

  private noise(ctx: AudioContext) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  start() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(ctx.destination)

      // mưa: nhiễu trắng qua bộ lọc
      const nz = ctx.createBufferSource()
      nz.buffer = this.noise(ctx)
      nz.loop = true
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
      const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 7000
      this.rain = ctx.createGain(); this.rain.gain.value = 0
      nz.connect(hp).connect(bp).connect(this.rain).connect(this.master)
      nz.start()

      // nhạc nền: hợp âm synth mềm + echo
      const pad = ctx.createGain(); pad.gain.value = 0.05
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07
      const lfoG = ctx.createGain(); lfoG.gain.value = 260
      lfo.connect(lfoG).connect(lp.frequency); lfo.start()
      for (const f of [110, 164.81, 207.65, 261.63, 329.63]) {
        for (const det of [-7, 6]) {
          const o = ctx.createOscillator()
          o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det
          o.connect(lp); o.start()
        }
      }
      const delay = ctx.createDelay(1); delay.delayTime.value = 0.38
      const fb = ctx.createGain(); fb.gain.value = 0.42
      delay.connect(fb).connect(delay)
      lp.connect(pad)
      pad.connect(this.master)
      pad.connect(delay)
      delay.connect(this.master)
    }
    this.ctx.resume()
    this.setMuted(false)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.25)
    if (m) setTimeout(() => this.muted && this.ctx?.suspend(), 600)
  }

  /** amount 0..1 */
  setRain(amount: number) {
    if (!this.ctx) return
    this.rain.gain.setTargetAtTime(amount * 0.22, this.ctx.currentTime, 0.4)
  }

  blip(freq = 880) {
    const ctx = this.ctx
    if (!ctx || this.muted) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    o.connect(g).connect(this.master)
    o.start(); o.stop(ctx.currentTime + 0.2)
  }

  thunder() {
    const ctx = this.ctx
    if (!ctx || this.muted) return
    const src = ctx.createBufferSource(); src.buffer = this.noise(ctx)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2)
    src.connect(lp).connect(g).connect(this.master)
    src.start(); src.stop(ctx.currentTime + 3.3)
  }
}

export const engine = new Engine()
