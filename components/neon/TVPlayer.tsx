'use client'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { music, TRACKS } from '@/lib/music'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const W = 1024
const H = 640
const BARS = 36

type Hit = { id: string; x: number; y: number; w: number; h: number; run: (px: number) => void }

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Vẽ màn hình TV (synthwave + thông tin bài + equalizer + nút bấm) và trả về các vùng bấm. */
function drawScreen(ctx: CanvasRenderingContext2D, t: number, hover: string | null): Hit[] {
  const hits: Hit[] = []
  const playing = music.playing
  const tr = TRACKS[music.index]

  // nền: trời tím + mặt trời + lưới chân trời chạy
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0a0216'); bg.addColorStop(0.55, '#2b0a4a'); bg.addColorStop(1, '#100420')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const hzSun = 330
  const sunY = hzSun
  const sun = ctx.createLinearGradient(0, sunY - 110, 0, sunY + 110)
  sun.addColorStop(0, '#ffd34d'); sun.addColorStop(1, '#ff2fa0')
  ctx.save()
  ctx.beginPath(); ctx.arc(W * 0.36, hzSun, 105, Math.PI, 0); ctx.closePath()
  ctx.fillStyle = sun; ctx.globalAlpha = 0.55; ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(255,63,208,.35)'; ctx.lineWidth = 2
  const hz = 330
  for (let i = 0; i < 12; i++) {
    const k = ((i + (t * (playing ? 0.6 : 0.15)) % 1) / 12)
    const y = hz + Math.pow(k, 2.2) * (H - hz)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo(W / 2 + i * 22, hz); ctx.lineTo(W / 2 + i * 150, H); ctx.stroke()
  }
  // scanlines nhẹ
  ctx.fillStyle = 'rgba(0,0,0,.12)'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)

  // thanh trên
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 22px "Helvetica Neue", Arial, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.globalAlpha = 0.75
  ctx.fillText('NEON FM', 36, 38)
  ctx.textAlign = 'right'
  ctx.fillText(playing ? '● ON AIR' : '○ STANDBY', W - 36, 38)
  ctx.globalAlpha = 1

  // tên bài
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = 24
  ctx.font = '800 62px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(tr.title, 36, 104)
  ctx.shadowBlur = 0
  ctx.font = '500 24px "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#c9b8e8'
  ctx.fillText(`${tr.artist}  ·  ${tr.mood}`, 38, 152)

  // danh sách bài (bên phải)
  const lx = 600, lw = W - lx - 36
  TRACKS.forEach((trk, i) => {
    const y = 96 + i * 62
    const on = i === music.index
    const hv = hover === `track${i}`
    ctx.fillStyle = on ? 'rgba(255,63,208,.28)' : hv ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'
    rr(ctx, lx, y, lw, 52, 14); ctx.fill()
    if (on) { ctx.strokeStyle = '#ff6fe0'; ctx.lineWidth = 2; rr(ctx, lx, y, lw, 52, 14); ctx.stroke() }
    ctx.fillStyle = on ? '#fff' : '#d8cdf0'
    ctx.font = `${on ? 700 : 600} 24px "Helvetica Neue", Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(`${on && playing ? '♪' : i + 1}   ${trk.title}`, lx + 18, y + 27)
    ctx.textAlign = 'right'
    ctx.font = '500 18px "Helvetica Neue", Arial, sans-serif'
    ctx.fillStyle = '#b9a6dd'
    ctx.fillText(trk.mood, lx + lw - 18, y + 27)
    hits.push({ id: `track${i}`, x: lx, y, w: lw, h: 52, run: () => void music.play(i) })
  })

  // equalizer
  const lv = music.levels(BARS)
  const ex = 36, ew = 520, ey = 440, eh = 110
  const bw = ew / BARS
  for (let i = 0; i < BARS; i++) {
    const l = playing ? lv[i] : 0.05 + 0.04 * Math.sin(t * 1.5 + i * 0.5)
    const h = 4 + l * eh
    ctx.fillStyle = `hsl(${320 - (i / BARS) * 130}, 100%, ${55 + l * 15}%)`
    rr(ctx, ex + i * bw + 1.5, ey + eh - h, bw - 3, h, 3); ctx.fill()
  }

  // thanh tiến trình (giả lập vòng lặp 2 phút) + thời gian
  const el = music.elapsed()
  const px = 36, pw = W - 72, py = 574
  ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, px, py, pw, 6, 3); ctx.fill()
  ctx.fillStyle = '#ffd34d'; rr(ctx, px, py, Math.max(6, pw * ((el % 120) / 120)), 6, 3); ctx.fill()
  ctx.fillStyle = '#c9b8e8'; ctx.font = '500 18px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.fillText(mmss(el), px, py + 24)

  // nút điều khiển
  const cy = 600
  const btn = (id: string, cx: number, r: number, label: string, primary: boolean, run: () => void) => {
    const hv = hover === id
    ctx.fillStyle = primary ? (hv ? '#ffe07a' : '#ffd34d') : hv ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.14)'
    ctx.beginPath(); ctx.arc(cx, cy - 6, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = primary ? '#1a1405' : '#ffffff'
    ctx.font = `700 ${primary ? 26 : 20}px "Helvetica Neue", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(label, cx, cy - 5)
    hits.push({ id, x: cx - r, y: cy - 6 - r, w: r * 2, h: r * 2, run })
  }
  void cy
  btn('prev', W / 2 - 100, 24, '⏮', false, () => music.prev())
  btn('play', W / 2, 30, playing ? '❚❚' : '▶', true, () => music.toggle())
  btn('next', W / 2 + 100, 24, '⏭', false, () => music.next())

  // âm lượng
  const vx = 700, vw = 288, vy = cy - 12
  ctx.fillStyle = '#c9b8e8'; ctx.font = '500 18px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('VOL', vx - 54, vy + 6)
  ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ctx, vx, vy, vw, 12, 6); ctx.fill()
  ctx.fillStyle = hover === 'vol' ? '#ffe07a' : '#ffd34d'; rr(ctx, vx, vy, Math.max(12, vw * music.volume), 12, 6); ctx.fill()
  ctx.beginPath(); ctx.arc(vx + vw * music.volume, vy + 6, 11, 0, Math.PI * 2); ctx.fill()
  hits.push({ id: 'vol', x: vx - 10, y: vy - 14, w: vw + 20, h: 40, run: (cx) => music.setVolume(Math.min(1, Math.max(0, (cx - vx) / vw))) })

  return hits
}

/**
 * TV phát nhạc đặt ở "góc mới" trong khoảng đen bên trái phố. Màn hình là canvas được vẽ mỗi frame;
 * bấm trực tiếp lên màn hình (nút ⏮ ▶ ⏭, danh sách bài, thanh âm lượng) để điều khiển nhạc.
 */
export function TVPlayer({ position, yaw, active, onActivate }: {
  position: [number, number, number]; yaw: number; active: boolean; onActivate: () => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  const hitsRef = useRef<Hit[]>([])
  const frame = useRef(0)
  const root = useRef<THREE.Group>(null)
  const glow = useMemo(() => glowTexture(), [])
  const halo = useRef<THREE.Mesh>(null)
  const posVec = useMemo(() => new THREE.Vector3(...position), [position])

  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return { canvas: c, tex: t }
  }, [])

  useFrame(({ clock, camera }) => {
    // vẽ ~30fps khi camera ở gần, thưa hơn khi ở xa để đỡ tốn
    const d = camera.position.distanceTo(posVec)
    if (root.current) root.current.visible = active || d < 1.2
    frame.current++
    const every = d < 1.6 ? 2 : 12
    if (frame.current % every === 0) {
      const ctx = canvas.getContext('2d')!
      ctx.save()
      hitsRef.current = drawScreen(ctx, clock.elapsedTime, hoverRef.current)
      ctx.restore()
      tex.needsUpdate = true
    }
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = (0.2 + (music.playing ? 0.15 * Math.sin(clock.elapsedTime * 3) : 0)) * live.neon
  })

  const locate = (uv: THREE.Vector2 | undefined) => {
    if (!uv) return null
    const x = uv.x * W, y = (1 - uv.y) * H
    return { x, y, hit: hitsRef.current.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ?? null }
  }

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* vầng sáng sau TV */}
      <mesh ref={halo} position={[0, 0, -0.03]} raycast={() => null}>
        <planeGeometry args={[0.85, 0.58]} />
        <meshBasicMaterial map={glow} color="#ff3fd0" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* viền neon */}
      <RoundedBox args={[0.545, 0.355, 0.03]} radius={0.016} smoothness={3} position={[0, 0, -0.004]} raycast={() => null}>
        <meshBasicMaterial color="#ff4fe0" toneMapped={false} />
      </RoundedBox>
      {/* thân TV */}
      <RoundedBox args={[0.53, 0.34, 0.036]} radius={0.014} smoothness={3} raycast={() => null}>
        <meshBasicMaterial color="#14141c" toneMapped={false} />
      </RoundedBox>
      {/* màn hình */}
      <mesh
        position={[0, 0, 0.0185]}
        onClick={(e) => {
          e.stopPropagation()
          if (!active) { onActivate(); return }
          const p = locate(e.uv)
          p?.hit?.run(p.x)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          const h = active ? locate(e.uv)?.hit?.id ?? null : null
          hoverRef.current = h
          if (h !== hover) setHover(h)
          document.body.style.cursor = !active || h ? 'pointer' : 'default'
        }}
        onPointerOut={() => { hoverRef.current = null; setHover(null); document.body.style.cursor = '' }}
      >
        <planeGeometry args={[0.49, 0.306]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* chân đế */}
      <mesh position={[0, -0.205, -0.01]} raycast={() => null}>
        <boxGeometry args={[0.05, 0.07, 0.03]} />
        <meshBasicMaterial color="#1b1b26" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.245, -0.01]} raycast={() => null}>
        <boxGeometry args={[0.2, 0.012, 0.09]} />
        <meshBasicMaterial color="#1b1b26" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.236, 0.036]} raycast={() => null}>
        <boxGeometry args={[0.2, 0.0025, 0.0025]} />
        <meshBasicMaterial color="#ff4fe0" toneMapped={false} />
      </mesh>
    </group>
  )
}
