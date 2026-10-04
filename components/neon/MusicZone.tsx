'use client'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { music } from '@/lib/music'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const BARS = 16
const R_BARS = 0.056

function vinylTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')!
  x.fillStyle = '#1a1a24'
  x.fillRect(0, 0, 256, 256)
  for (let r = 40; r < 126; r += 3.2) {
    x.strokeStyle = `rgba(255,255,255,${0.1 + ((r * 7) % 5) * 0.03})`
    x.lineWidth = 1
    x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.stroke()
  }
  const g = x.createLinearGradient(0, 40, 256, 216)
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.12)')
  x.fillStyle = g
  x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill()
  const lab = x.createRadialGradient(128, 128, 0, 128, 128, 36)
  lab.addColorStop(0, '#ffd34d'); lab.addColorStop(1, '#ff3fa8')
  x.fillStyle = lab
  x.beginPath(); x.arc(128, 128, 36, 0, Math.PI * 2); x.fill()
  x.fillStyle = '#0b0b10'
  x.beginPath(); x.arc(128, 128, 5, 0, Math.PI * 2); x.fill()
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  return t
}

function labelTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const x = c.getContext('2d')!
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = '800 74px "Helvetica Neue", Arial, sans-serif'
  x.lineJoin = 'round'
  x.shadowColor = '#ff3fd0'; x.shadowBlur = 34
  x.strokeStyle = '#ff3fd0'; x.lineWidth = 12
  x.strokeText('MUSIC', 256, 66)
  x.shadowBlur = 14
  x.fillStyle = '#ffe3fa'
  x.fillText('MUSIC', 256, 66)
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  return t
}

/**
 * Khu nghe nhạc: sàn diễn tròn giữa đường với 16 cột equalizer 3D chạy theo nhạc đang phát,
 * đĩa than xoay lơ lửng phía trên và chữ MUSIC. Bấm vào để mở trình phát.
 */
const _p = new THREE.Vector3()

export function MusicZone({ position, onSelect }: { position: [number, number, number]; onSelect: () => void }) {
  const bars = useRef<(THREE.Mesh | null)[]>([])
  const ring = useRef<THREE.Mesh>(null)
  const vinyl = useRef<THREE.Group>(null)
  const pool = useRef<THREE.Mesh>(null)
  const grp = useRef<THREE.Group>(null)
  const label = useRef<THREE.Mesh>(null)
  const hover = useRef(0)
  const [hovered, setHovered] = useState(false)
  const spin = useRef(0)
  const glow = useMemo(() => glowTexture(), [])
  const vinylTex = useMemo(() => vinylTexture(), [])
  const labelTex = useMemo(() => labelTexture(), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    // chữ MUSIC chỉ hiện khi camera đến gần (nhìn toàn cảnh thì nó chồng lên biển Skills)
    if (label.current) {
      const d = camera.position.distanceTo(grp.current!.getWorldPosition(_p))
      const a = Math.min(1, Math.max(0, (1.3 - d) / 0.4))
      ;(label.current.material as THREE.MeshBasicMaterial).opacity = a
      label.current.visible = a > 0.01
    }
    const lv = music.levels(BARS)
    const playing = music.playing
    let energy = 0
    for (let i = 0; i < BARS; i++) {
      const idle = 0.07 + 0.05 * Math.sin(t * 1.6 + i * 0.7)
      const l = playing ? lv[i] : idle
      energy += l
      const m = bars.current[i]
      if (!m) continue
      const h = 0.006 + l * 0.085
      m.scale.y += (h - m.scale.y) * Math.min(1, dt * 18)
      m.position.y = m.scale.y / 2 + 0.003
      const mat = m.material as THREE.MeshBasicMaterial
      tmp.setHSL(0.9 - (i / BARS) * 0.42, 1, 0.5 + l * 0.18)
      mat.color.copy(tmp).multiplyScalar((0.55 + l * 1.3) * live.neon)
    }
    energy /= BARS
    spin.current += dt * (playing ? 2.4 : 0.35)
    if (vinyl.current) {
      vinyl.current.rotation.y = spin.current
      vinyl.current.position.y = 0.135 + Math.sin(t * 1.4) * 0.004 + (playing ? energy * 0.01 : 0)
    }
    if (ring.current) {
      tmp.setHSL(0.86 + 0.08 * Math.sin(t * 0.5), 1, 0.55)
      ;(ring.current.material as THREE.MeshBasicMaterial).color.copy(tmp).multiplyScalar((0.9 + energy * 1.6) * live.neon)
    }
    if (pool.current) {
      const m = pool.current.material as THREE.MeshBasicMaterial
      m.opacity = (0.28 + energy * 0.7) * live.neon
      tmp.setHSL(0.88 - energy * 0.2, 1, 0.5)
      m.color.copy(tmp)
    }
    hover.current += ((hovered ? 1 : 0) - hover.current) * Math.min(1, dt * 10)
    if (grp.current) grp.current.scale.setScalar(1 + hover.current * 0.06)
  })

  return (
    <group
      ref={grp}
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
    >
      {/* vùng bấm vô hình */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.24, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* vệt sáng trên đường */}
      <mesh ref={pool} position={[0, 0.003, 0]} rotation-x={-Math.PI / 2} renderOrder={2} raycast={() => null}>
        <planeGeometry args={[0.36, 0.36]} />
        <meshBasicMaterial map={glow} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* bệ + viền neon */}
      <mesh position={[0, 0.003, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.088, 0.094, 0.006, 48]} />
        <meshBasicMaterial color="#10101a" toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.0065, 0]} rotation-x={Math.PI / 2} raycast={() => null}>
        <torusGeometry args={[0.088, 0.0016, 8, 64]} />
        <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
      </mesh>

      {/* cột equalizer */}
      {Array.from({ length: BARS }, (_, i) => {
        const a = (i / BARS) * Math.PI * 2
        return (
          <mesh key={i} ref={(el) => { bars.current[i] = el }} position={[Math.cos(a) * R_BARS, 0.01, Math.sin(a) * R_BARS]} rotation-y={-a} raycast={() => null}>
            <boxGeometry args={[0.009, 1, 0.009]} />
            <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
          </mesh>
        )
      })}

      {/* đĩa than xoay */}
      <group ref={vinyl} position={[0, 0.135, 0]}>
        <group rotation-x={1.05}>
          <mesh rotation-y={0} raycast={() => null}>
            <cylinderGeometry args={[0.042, 0.042, 0.002, 48]} />
            <meshBasicMaterial attach="material-0" color="#0b0b10" toneMapped={false} />
            <meshBasicMaterial attach="material-1" map={vinylTex} toneMapped={false} />
            <meshBasicMaterial attach="material-2" map={vinylTex} toneMapped={false} />
          </mesh>
          <mesh rotation-x={Math.PI / 2} raycast={() => null}>
            <torusGeometry args={[0.0425, 0.0013, 8, 64]} />
            <meshBasicMaterial color="#ff6fe0" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* chữ MUSIC luôn quay về phía camera */}
      <Billboard position={[0, 0.215, 0]}>
        <mesh ref={label} raycast={() => null}>
          <planeGeometry args={[0.17, 0.0425]} />
          <meshBasicMaterial map={labelTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  )
}
