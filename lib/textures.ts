import * as THREE from 'three'

let glow: THREE.CanvasTexture | null = null
let streak: THREE.CanvasTexture | null = null
let beam: THREE.CanvasTexture | null = null

/** Chấm sáng tròn mềm. */
export function glowTexture() {
  if (glow) return glow
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return (glow = new THREE.CanvasTexture(c))
}

/** Vệt sáng đuôi: sáng ở đầu (v=0, đáy ảnh), mờ dần về đuôi. */
export function streakTexture() {
  if (streak) return streak
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 128
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  x.fillStyle = g
  x.fillRect(0, 0, 8, 128)
  return (streak = new THREE.CanvasTexture(c))
}

/** Chùm đèn pha: sáng ở đỉnh nón (v=1, đỉnh ảnh), mờ dần ra xa. */
export function beamTexture() {
  if (beam) return beam
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, 'rgba(255,255,255,.9)')
  g.addColorStop(0.6, 'rgba(255,255,255,.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 128)
  return (beam = new THREE.CanvasTexture(c))
}
