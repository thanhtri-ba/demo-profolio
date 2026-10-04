'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'

const N = 3200
const X = 0.8, Z = 0.8, TOP = 0.95, LEN = 0.035

/** Mưa: LineSegments cập nhật trên CPU. Lượng mưa lấy từ live.rain (0..1). */
export function Rain({ max = 1 }: { max?: number }) {
  const ref = useRef<THREE.LineSegments>(null)
  const mat = useRef<THREE.LineBasicMaterial>(null)
  const speeds = useMemo(() => Float32Array.from({ length: N }, () => 0.9 + Math.random() * 0.8), [])
  const geo = useMemo(() => {
    const p = new Float32Array(N * 6)
    for (let i = 0; i < N; i++) {
      const x = (Math.random() * 2 - 1) * X, y = Math.random() * TOP, z = (Math.random() * 2 - 1) * Z
      p.set([x, y, z, x - LEN * 0.15, y + LEN, z], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    const amt = live.rain * max
    if (ref.current) ref.current.visible = amt > 0.02
    if (amt <= 0.02) return
    const count = Math.max(1, Math.floor(N * amt))
    geo.setDrawRange(0, count * 2)
    if (mat.current) mat.current.opacity = 0.16 + 0.16 * Math.min(1, amt)
    const a = geo.getAttribute('position') as THREE.BufferAttribute
    const p = a.array as Float32Array
    const boost = 1 + live.rain * 0.4
    for (let i = 0; i < count; i++) {
      const d = speeds[i] * dt * boost
      p[i * 6 + 1] -= d
      p[i * 6 + 4] -= d
      p[i * 6] -= d * 0.15
      p[i * 6 + 3] -= d * 0.15
      if (p[i * 6 + 1] < 0) {
        const x = (Math.random() * 2 - 1) * X, z = (Math.random() * 2 - 1) * Z
        p.set([x, TOP, z, x - LEN * 0.15, TOP + LEN, z], i * 6)
      }
    }
    a.needsUpdate = true
  })

  return (
    <lineSegments ref={ref} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial ref={mat} color="#a8d8ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}
