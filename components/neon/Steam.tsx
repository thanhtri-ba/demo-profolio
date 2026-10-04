'use client'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { glowTexture } from '@/lib/textures'

const PER = 28
const LIFE = 3.2

/** Hơi nước bốc lên từ cống/ống thoát (additive, mờ dần). */
export function Steam({ sources }: { sources: [number, number, number][] }) {
  const N = sources.length * PER
  const tex = useMemo(() => glowTexture(), [])
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const age = new Float32Array(N)
    const vel = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      age[i] = Math.random() * LIFE
      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = 0.04 + Math.random() * 0.05
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return { g, pos, col, age, vel }
  }, [N])

  useFrame((_, dt) => {
    const { pos, col, age, vel, g } = data
    for (let i = 0; i < N; i++) {
      age[i] += dt
      const src = sources[Math.floor(i / PER)]
      if (age[i] > LIFE) {
        age[i] = 0
        pos.set([src[0] + (Math.random() - 0.5) * 0.012, src[1], src[2] + (Math.random() - 0.5) * 0.012], i * 3)
      }
      pos[i * 3] += vel[i * 3] * dt + Math.sin(age[i] * 1.6 + i) * 0.0004
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      const a = Math.sin((age[i] / LIFE) * Math.PI) * 0.35
      col[i * 3] = 0.85 * a
      col[i * 3 + 1] = 0.7 * a
      col[i * 3 + 2] = 1.0 * a
    }
    g.getAttribute('position').needsUpdate = true
    g.getAttribute('color').needsUpdate = true
  })

  return (
    <points geometry={data.g} frustumCulled={false}>
      <pointsMaterial map={tex} size={0.05} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
