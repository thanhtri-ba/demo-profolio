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

  pcPowerOn() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!this.ctx && Ctx) this.ctx = new Ctx()
      const ctx = this.ctx
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume()
      const now = ctx.currentTime

      // 1. Công tắc cơ học click "tách"
      const clickSrc = ctx.createBufferSource()
      clickSrc.buffer = this.noise(ctx)
      const clickF = ctx.createBiquadFilter()
      clickF.type = 'bandpass'; clickF.frequency.value = 3500
      const clickG = ctx.createGain()
      clickG.gain.setValueAtTime(0.001, now)
      clickG.gain.exponentialRampToValueAtTime(0.35, now + 0.005)
      clickG.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
      clickSrc.connect(clickF).connect(clickG).connect(ctx.destination)
      clickSrc.start(now); clickSrc.stop(now + 0.04)

      // 2. Tiếng quạt tản nhiệt quay tăng tốc (Fan spin-up whoosh)
      const fanSrc = ctx.createBufferSource()
      fanSrc.buffer = this.noise(ctx)
      const fanF = ctx.createBiquadFilter()
      fanF.type = 'lowpass'
      fanF.frequency.setValueAtTime(80, now + 0.05)
      fanF.frequency.exponentialRampToValueAtTime(450, now + 1.2)
      const fanG = ctx.createGain()
      fanG.gain.setValueAtTime(0.001, now + 0.05)
      fanG.gain.exponentialRampToValueAtTime(0.12, now + 0.5)
      fanG.gain.exponentialRampToValueAtTime(0.02, now + 2.0)
      fanSrc.connect(fanF).connect(fanG).connect(ctx.destination)
      fanSrc.start(now + 0.05); fanSrc.stop(now + 2.2)

      // 3. Tiếng Beep BIOS khởi động
      const beep = ctx.createOscillator()
      const beepG = ctx.createGain()
      beep.type = 'sine'; beep.frequency.setValueAtTime(1046.5, now + 0.6)
      beepG.gain.setValueAtTime(0.001, now + 0.6)
      beepG.gain.exponentialRampToValueAtTime(0.15, now + 0.61)
      beepG.gain.exponentialRampToValueAtTime(0.001, now + 0.72)
      beep.connect(beepG).connect(ctx.destination)
      beep.start(now + 0.6); beep.stop(now + 0.75)

      // 4. Hợp âm khởi động Windows (Startup Chime chord)
      const chord = [311.13, 466.16, 392.00, 523.25]
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        const noteStart = now + 1.2 + idx * 0.14
        osc.frequency.setValueAtTime(freq, noteStart)
        g.gain.setValueAtTime(0.001, noteStart)
        g.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.9)
        osc.connect(g).connect(ctx.destination)
        osc.start(noteStart); osc.stop(noteStart + 0.95)
      })
    } catch {}
  }

  pcPowerOff() {
    try {
      const ctx = this.ctx
      if (!ctx) return
      const now = ctx.currentTime

      const clickSrc = ctx.createBufferSource()
      clickSrc.buffer = this.noise(ctx)
      const clickF = ctx.createBiquadFilter()
      clickF.type = 'bandpass'; clickF.frequency.value = 2500
      const clickG = ctx.createGain()
      clickG.gain.setValueAtTime(0.001, now)
      clickG.gain.exponentialRampToValueAtTime(0.3, now + 0.005)
      clickG.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
      clickSrc.connect(clickF).connect(clickG).connect(ctx.destination)
      clickSrc.start(now); clickSrc.stop(now + 0.035)

      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now + 0.05)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.6)
      g.gain.setValueAtTime(0.12, now + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
      osc.connect(g).connect(ctx.destination)
      osc.start(now + 0.05); osc.stop(now + 0.65)
    } catch {}
  }
}

export const engine = new Engine()
