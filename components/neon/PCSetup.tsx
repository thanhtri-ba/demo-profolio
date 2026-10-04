'use client'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const SW = 256, SH = 160

function labelTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const x = c.getContext('2d')!
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = '800 64px "Helvetica Neue", Arial, sans-serif'
  x.lineJoin = 'round'
  x.shadowColor = '#7b3bff'; x.shadowBlur = 30
  x.strokeStyle = '#7b3bff'; x.lineWidth = 12
  x.strokeText('MY PC', 256, 66)
  x.shadowBlur = 12; x.fillStyle = '#efe6ff'
  x.fillText('MY PC', 256, 66)
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  return t
}

/**
 * PC chơi game thu nhỏ đặt trên đường (cổng vào): bấm để camera bay sang "bàn máy tính của tôi".
 * Màn hình nhỏ chạy hiệu ứng, tower có quạt RGB.
 */
export function PCSetup({ position, yaw, onSelect }: { position: [number, number, number]; yaw: number; onSelect: () => void }) {
  const glow = useMemo(() => glowTexture(), [])
  const label = useMemo(() => labelTexture(), [])
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = SW; c.height = SH
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { canvas: c, tex: t }
  }, [])
  const grp = useRef<THREE.Group>(null)
  const labelMesh = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const pool = useRef<THREE.Mesh>(null)
  const frame = useRef(0)
  const hover = useRef(0)
  const [hovered, setHovered] = useState(false)
  const tmp = useMemo(() => new THREE.Color(), [])
  const wp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    frame.current++
    if (frame.current % 8 === 0) {
      const ctx = canvas.getContext('2d')!
      const g = ctx.createLinearGradient(0, 0, SW, SH)
      g.addColorStop(0, `hsl(${(t * 40) % 360},90%,16%)`); g.addColorStop(1, `hsl(${(t * 40 + 120) % 360},90%,30%)`)
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH)
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = '800 38px "Helvetica Neue", Arial, sans-serif'
      ctx.fillText('▶ PLAY', SW / 2, SH / 2 - 8)
      ctx.font = '600 15px "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = '#e8dcff'
      ctx.fillText('NEON SNAKE · CODE · PROJECTS', SW / 2, SH / 2 + 30)
      tex.needsUpdate = true
    }
    if (ring.current) (ring.current.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.2) % 1, 1, 0.55).multiplyScalar(live.neon + 0.3)
    if (pool.current) {
      const m = pool.current.material as THREE.MeshBasicMaterial
      m.opacity = (0.35 + 0.1 * Math.sin(t * 2)) * live.neon
      tmp.setHSL((t * 0.2) % 1, 1, 0.5); m.color.copy(tmp)
    }
    if (labelMesh.current) {
      const d = camera.position.distanceTo(grp.current!.getWorldPosition(wp))
      const a = Math.min(1, Math.max(0, (1.3 - d) / 0.4))
      ;(labelMesh.current.material as THREE.MeshBasicMaterial).opacity = a
      labelMesh.current.visible = a > 0.01
    }
    hover.current += ((hovered ? 1 : 0) - hover.current) * Math.min(1, dt * 10)
    if (grp.current) grp.current.scale.setScalar(1 + hover.current * 0.08)
  })

  return (
    <group
      ref={grp}
      position={position}
      rotation-y={yaw}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
    >
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.16, 0.1, 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={pool} position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} renderOrder={2} raycast={() => null}>
        <planeGeometry args={[0.26, 0.2]} />
        <meshBasicMaterial map={glow} color="#7b3bff" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* bàn nhỏ */}
      <RoundedBox args={[0.13, 0.006, 0.07]} radius={0.002} smoothness={2} position={[0, 0.036, 0]} raycast={() => null}>
        <meshBasicMaterial color="#1a1a26" toneMapped={false} />
      </RoundedBox>
      {[-0.058, 0.058].map((x) => (
        <mesh key={x} position={[x, 0.018, 0]} raycast={() => null}>
          <boxGeometry args={[0.006, 0.036, 0.06]} />
          <meshBasicMaterial color="#111119" toneMapped={false} />
        </mesh>
      ))}
      {/* màn hình */}
      <RoundedBox args={[0.074, 0.05, 0.006]} radius={0.003} smoothness={2} position={[-0.012, 0.068, -0.012]} raycast={() => null}>
        <meshBasicMaterial color="#14141c" toneMapped={false} />
      </RoundedBox>
      <mesh position={[-0.012, 0.0685, -0.0085]} raycast={() => null}>
        <planeGeometry args={[0.07, 0.044]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[-0.012, 0.042, -0.012]} raycast={() => null}>
        <boxGeometry args={[0.012, 0.012, 0.01]} />
        <meshBasicMaterial color="#1b1b27" toneMapped={false} />
      </mesh>
      {/* bàn phím RGB */}
      <mesh position={[-0.012, 0.0405, 0.018]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[0.058, 0.016]} />
        <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
      </mesh>
      {/* tower */}
      <group position={[0.07, 0.03, 0]}>
        <RoundedBox args={[0.032, 0.062, 0.05]} radius={0.003} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#0d0d15" toneMapped={false} />
        </RoundedBox>
        <mesh ref={ring} position={[0, 0.006, 0.0255]} raycast={() => null}>
          <torusGeometry args={[0.009, 0.0016, 8, 24]} />
          <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.016, 0.0255]} raycast={() => null}>
          <torusGeometry args={[0.007, 0.0014, 8, 24]} />
          <meshBasicMaterial color="#7b3bff" toneMapped={false} />
        </mesh>
      </group>
      {/* nhãn */}
      <Billboard position={[0, 0.135, 0]}>
        <mesh ref={labelMesh} raycast={() => null}>
          <planeGeometry args={[0.15, 0.0375]} />
          <meshBasicMaterial map={label} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  )
}
