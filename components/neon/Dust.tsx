'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const N = 80

/** Hạt bụi neon trôi lơ lửng (additive, texture tròn mềm – không viền vuông). */
export function Dust() {
  const ref = useRef<THREE.Points>(null)
  const { geo, base, tex } = useMemo(() => {
    const base = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) base.set([(Math.random() * 2 - 1) * 0.7, 0.05 + Math.random() * 0.8, (Math.random() * 2 - 1) * 0.7], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const x = c.getContext('2d')!
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(255,255,255,.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = grad
    x.fillRect(0, 0, 64, 64)
    return { geo: g, base, tex: new THREE.CanvasTexture(c) }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      a.setXYZ(
        i,
        base[i * 3] + Math.sin(t * 0.25 + i) * 0.04,
        base[i * 3 + 1] + Math.sin(t * 0.4 + i * 1.7) * 0.03,
        base[i * 3 + 2] + Math.cos(t * 0.22 + i * 0.6) * 0.04,
      )
    }
    a.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial map={tex} color="#ff9cf0" size={0.022} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
