'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const GROUND_Y = 0.017
const RIPPLES = 18

function ringTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  x.strokeStyle = 'rgba(255,255,255,.9)'
  x.lineWidth = 5
  x.beginPath()
  x.arc(64, 64, 52, 0, Math.PI * 2)
  x.stroke()
  return new THREE.CanvasTexture(c)
}

/**
 * Mặt đường ướt: vệt sáng neon loang xuống đường dưới mỗi bảng hiệu (additive, chớp theo neon)
 * + gợn nước tròn lan ra khi trời mưa. Hoàn toàn procedural, không đụng tới texture của model.
 */
export function LightPools({ sources }: { sources: [number, number, string][] }) {
  const tex = useMemo(() => glowTexture(), [])
  const ring = useMemo(() => ringTexture(), [])
  const pools = useMemo(
    () =>
      sources.map(([x, z, c], i) => ({
        pos: [x, GROUND_Y, z] as [number, number, number],
        color: new THREE.Color(c),
        phase: i * 2.1,
      })),
    [sources],
  )
  const poolRefs = useRef<(THREE.Mesh | null)[]>([])
  const ripRefs = useRef<(THREE.Mesh | null)[]>([])
  const rip = useRef(
    Array.from({ length: RIPPLES }, () => ({ t: Math.random(), x: 0, z: 0, c: 0, seeded: false })),
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    pools.forEach((p, i) => {
      const m = poolRefs.current[i]
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = (0.42 + 0.1 * Math.sin(t * 1.7 + p.phase)) * live.neon * (0.8 + live.rain * 0.5)
    })
    rip.current.forEach((r, i) => {
      const m = ripRefs.current[i]
      if (!m) return
      r.t += dt * 0.9
      if (r.t >= 1 || !r.seeded) {
        r.t = r.seeded ? 0 : Math.random()
        r.seeded = true
        const p = pools[Math.floor(Math.random() * pools.length)]
        r.x = p.pos[0] + (Math.random() - 0.5) * 0.18
        r.z = p.pos[2] + (Math.random() - 0.5) * 0.18
        r.c = Math.floor(Math.random() * pools.length)
      }
      const mat = m.material as THREE.MeshBasicMaterial
      const k = r.t
      m.position.set(r.x, GROUND_Y + 0.0005, r.z)
      m.scale.setScalar(0.004 + k * 0.03)
      mat.color.copy(pools[r.c % pools.length].color)
      mat.opacity = (1 - k) * (1 - k) * Math.min(1, live.rain * 1.6) * 0.8 * live.neon
    })
  })

  return (
    <group>
      {pools.map((p, i) => (
        <mesh key={i} ref={(el) => { poolRefs.current[i] = el }} position={p.pos} rotation-x={-Math.PI / 2} scale={[0.26, 0.16, 1]} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} color={p.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
      {Array.from({ length: RIPPLES }, (_, i) => (
        <mesh key={`r${i}`} ref={(el) => { ripRefs.current[i] = el }} rotation-x={-Math.PI / 2} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={ring} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0} />
        </mesh>
      ))}
    </group>
  )
}
