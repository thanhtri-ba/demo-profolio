'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'

const X = 0.8, Z = 0.8, TOP = 0.95

/** Tuyết rơi: Points tròn mềm, mỗi bông có tốc độ + pha lắc ngang riêng. Luôn rơi, không phụ thuộc thời tiết. */
export function Snow({ count = 1400, size = 0.026 }: { count?: number; size?: number }) {
  const { geo, speed, phase, tex } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const speed = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p.set([(Math.random() * 2 - 1) * X, Math.random() * TOP, (Math.random() * 2 - 1) * Z], i * 3)
      speed[i] = 0.035 + Math.random() * 0.06
      phase[i] = Math.random() * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const x = c.getContext('2d')!
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.45, 'rgba(255,255,255,.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = grad
    x.fillRect(0, 0, 64, 64)
    return { geo: g, speed, phase, tex: new THREE.CanvasTexture(c) }
  }, [count])
  const ref = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)

  useFrame(({ clock }, dt) => {
    const amt = live.snow
    if (ref.current) ref.current.visible = amt > 0.02
    if (amt <= 0.02) return
    if (mat.current) mat.current.opacity = 0.95 * Math.min(1, amt * 1.5)
    geo.setDrawRange(0, Math.max(1, Math.floor(count * amt)))
    const t = clock.elapsedTime
    const a = geo.getAttribute('position') as THREE.BufferAttribute
    const p = a.array as Float32Array
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      const k = i * 3
      p[k + 1] -= speed[i] * d
      p[k] += Math.sin(t * 0.6 + phase[i]) * 0.012 * d + 0.006 * d
      p[k + 2] += Math.cos(t * 0.5 + phase[i] * 1.3) * 0.012 * d
      if (p[k + 1] < 0) {
        p[k] = (Math.random() * 2 - 1) * X
        p[k + 1] = TOP
        p[k + 2] = (Math.random() * 2 - 1) * Z
      }
      if (p[k] > X) p[k] = -X
    }
    a.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial ref={mat} map={tex} color="#ffffff" size={size} sizeAttenuation transparent opacity={0.95} depthWrite={false} toneMapped={false} />
    </points>
  )
}
