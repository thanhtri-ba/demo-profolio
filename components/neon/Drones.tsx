'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { glowTexture, streakTexture } from '@/lib/textures'
import { live } from '@/lib/mood'

const COLORS = ['#ff4fe0', '#2fe6ff', '#ffd34d', '#8dffbf']

/** Xe bay / drone neon lướt ngang phố, mỗi chiếc có vệt sáng phía sau. */
function Drone({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null)
  const state = useRef({ t: 1, delay: 0.5 + index * 2.2, len: 1, speed: 0.4, from: new THREE.Vector3(), to: new THREE.Vector3() })
  const color = useMemo(() => new THREE.Color(COLORS[index % COLORS.length]).multiplyScalar(2.2), [index])
  const glow = useMemo(() => glowTexture(), [])
  const streak = useMemo(() => streakTexture(), [])

  useFrame((_, dt) => {
    const g = group.current
    const s = state.current
    if (!g) return
    if (s.delay > 0) { s.delay -= dt; g.visible = false; return }
    if (s.t >= 1) {
      const alongX = Math.random() < 0.5
      const side = Math.random() < 0.5 ? -1 : 1
      const h = 0.58 + Math.random() * 0.3
      const off = (Math.random() * 2 - 1) * 0.45
      s.from.set(alongX ? -1.4 * side : off, h, alongX ? off : -1.4 * side)
      s.to.set(alongX ? 1.4 * side : off * 0.8, h + (Math.random() - 0.5) * 0.12, alongX ? off * 0.8 : 1.4 * side)
      s.len = s.from.distanceTo(s.to)
      s.speed = 0.35 + Math.random() * 0.25
      s.t = 0
      g.position.copy(s.from)
      g.lookAt(s.to)
      s.delay = 0
    }
    s.t += (dt * s.speed) / s.len
    if (s.t >= 1) { g.visible = false; s.delay = 1 + Math.random() * 5; return }
    g.visible = true
    g.position.lerpVectors(s.from, s.to, s.t)
    g.scale.setScalar(0.6 + 0.4 * Math.max(live.stars, 0.35)) // ban ngày nhỏ/nhạt hơn
  })

  return (
    <group ref={group} visible={false}>
      <mesh>
        <boxGeometry args={[0.014, 0.006, 0.03]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} fog={false} />
      </mesh>
      <sprite scale={[0.075, 0.075, 1]}>
        <spriteMaterial map={glow} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </sprite>
      {[0, Math.PI / 2].map((rz) => (
        <group key={rz} rotation={[0, 0, rz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.12]}>
            <planeGeometry args={[0.014, 0.24]} />
            <meshBasicMaterial map={streak} color={color} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Drones({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Drone key={i} index={i} />
      ))}
    </>
  )
}
