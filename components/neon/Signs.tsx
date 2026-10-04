'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Sign } from '@/lib/signs'
import { live } from '@/lib/mood'

const FAMILY = '"Avenir Next", "Futura", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'

/* ---------- màu ---------- */
function mix(hex: string, to: string, t: number) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16)
  const f = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return `rgb(${f(16)},${f(8)},${f(0)})`
}
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Vẽ bảng neon lên canvas:
 *  nền gradient + ánh kính → viền ống neon (halo + lõi trắng) → chữ ống neon (+ dòng phụ).
 *  style 'box' có thêm khung kim loại ngoài; 'inset' chỉ phủ lên khung có sẵn của model.
 */
export function drawSign(canvas: HTMLCanvasElement, s: Sign) {
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d')!
  const bg = s.bg ?? '#111111', color = s.color ?? '#ffffff', glow = s.glow ?? '#ffffff'
  const inset = s.style === 'inset'
  ctx.clearRect(0, 0, W, H)

  const rad = H * 0.16
  const m = inset ? 0 : H * 0.05
  const px = m, py = m, pw = W - m * 2, ph = H - m * 2

  if (!inset) {
    roundRect(ctx, 0, 0, W, H, rad)
    ctx.fillStyle = '#0b0b0e'
    ctx.fill()
  }

  // ----- nền panel -----
  roundRect(ctx, px, py, pw, ph, rad * 0.8)
  const g = ctx.createLinearGradient(0, py, 0, py + ph)
  g.addColorStop(0, mix(bg, glow, 0.18))
  g.addColorStop(0.55, bg)
  g.addColorStop(1, mix(bg, '#000000', 0.45))
  ctx.fillStyle = g
  ctx.fill()

  ctx.save()
  ctx.clip()
  const ambient = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.55)
  ambient.addColorStop(0, rgba(glow, 0.2))
  ambient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ambient
  ctx.fillRect(0, 0, W, H)
  const sheen = ctx.createLinearGradient(0, py, W * 0.55, py + ph)       // ánh phản chiếu kính
  sheen.addColorStop(0, 'rgba(255,255,255,.10)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // ----- viền ống neon -----
  const bi = H * 0.1, bw = H * 0.034
  roundRect(ctx, px + bi, py + bi, pw - bi * 2, ph - bi * 2, rad * 0.5)
  ctx.lineJoin = 'round'
  ctx.shadowColor = glow
  ctx.shadowBlur = H * 0.12
  ctx.strokeStyle = glow
  ctx.lineWidth = bw
  ctx.stroke()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = mix(glow, '#ffffff', 0.78)
  ctx.lineWidth = bw * 0.34
  ctx.stroke()

  // ----- chữ -----
  const lines = (s.text ?? '').split('\n')
  const hasSub = !!s.sub && W / H < 4 && lines.length === 1
  const boxW = pw - bi * 3.4
  const boxH = hasSub ? ph * 0.5 : ph * 0.58
  const cy = hasSub ? py + ph * 0.43 : py + ph * 0.5

  const setSpacing = (px_: number) => {
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
    if ('letterSpacing' in c) c.letterSpacing = `${px_}px`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let size = boxH / lines.length
  for (;;) {
    ctx.font = `700 ${size}px ${FAMILY}`
    setSpacing(size * 0.035)
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1)
    if (widest <= boxW || size < 10) break
    size *= 0.94
  }
  const lh = size * 1.1
  const y0 = cy - (lh * (lines.length - 1)) / 2
  lines.forEach((l, i) => {
    const y = y0 + i * lh
    ctx.lineJoin = 'round'
    ctx.shadowColor = glow
    ctx.shadowBlur = size * 0.5
    ctx.strokeStyle = glow
    ctx.lineWidth = size * 0.1
    ctx.strokeText(l, W / 2, y)                       // halo
    ctx.strokeText(l, W / 2, y)
    ctx.shadowBlur = size * 0.14
    ctx.fillStyle = mix(color, '#ffffff', 0.62)       // lõi ống sáng gần trắng
    ctx.fillText(l, W / 2, y)
    ctx.shadowBlur = 0
    ctx.fillText(l, W / 2, y)
  })

  if (hasSub) {
    const ss = ph * 0.11
    ctx.font = `600 ${ss}px ${FAMILY}`
    setSpacing(ss * 0.3)
    ctx.shadowColor = glow
    ctx.shadowBlur = ss * 0.7
    ctx.fillStyle = mix(glow, '#ffffff', 0.4)
    ctx.fillText(s.sub!.toUpperCase(), W / 2, py + ph * 0.77)
    ctx.shadowBlur = 0
  }
  setSpacing(0)
}

/** Tấm bo góc dày `d`, UV cho 2 mặt (mặt sau lật để không bị ngược chữ). */
function roundedSlab(w: number, h: number, d: number, r: number) {
  const x = -w / 2, y = -h / 2
  const sh = new THREE.Shape()
  sh.moveTo(x + r, y)
  sh.lineTo(x + w - r, y)
  sh.quadraticCurveTo(x + w, y, x + w, y + r)
  sh.lineTo(x + w, y + h - r)
  sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  sh.lineTo(x + r, y + h)
  sh.quadraticCurveTo(x, y + h, x, y + h - r)
  sh.lineTo(x, y + r)
  sh.quadraticCurveTo(x, y, x + r, y)
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 8 })
  g.translate(0, 0, -d / 2)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    let u = (p.getX(i) + w / 2) / w
    const v = (p.getY(i) + h / 2) / h
    if (p.getZ(i) < 0) u = 1 - u
    uv.setXY(i, u, v)
  }
  return g
}

/** Icon mạng xã hội nét căng (YouTube / LinkedIn), nền trong suốt. */
export function drawIcon(canvas: HTMLCanvasElement, kind: 'youtube' | 'linkedin' | 'github') {
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const mg = Math.min(W, H) * 0.03
  const r = Math.min(W, H) * 0.3
  roundRect(ctx, mg, mg, W - mg * 2, H - mg * 2, r)
  const top = kind === 'youtube' ? '#ff4a4a' : kind === 'github' ? '#59616c' : '#35c3ff'
  const bottom = kind === 'youtube' ? '#c4000a' : kind === 'github' ? '#12161b' : '#0a66c2'
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  ctx.clip()
  const sheen = ctx.createLinearGradient(0, 0, W, H * 0.7)
  sheen.addColorStop(0, 'rgba(255,255,255,.35)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  ctx.lineWidth = Math.min(W, H) * 0.035
  ctx.strokeStyle = 'rgba(255,255,255,.55)'
  roundRect(ctx, mg + ctx.lineWidth, mg + ctx.lineWidth, W - (mg + ctx.lineWidth) * 2, H - (mg + ctx.lineWidth) * 2, r * 0.85)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.35)'
  ctx.shadowBlur = Math.min(W, H) * 0.05
  ctx.shadowOffsetY = Math.min(W, H) * 0.02
  if (kind === 'youtube') {
    const s = Math.min(W, H) * 0.34
    ctx.beginPath()
    ctx.moveTo(W / 2 - s * 0.42, H / 2 - s * 0.62)
    ctx.lineTo(W / 2 - s * 0.42, H / 2 + s * 0.62)
    ctx.lineTo(W / 2 + s * 0.62, H / 2)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'github') {
    // mèo GitHub (đơn giản hoá): đầu tròn + 2 tai + 2 mắt
    const R = Math.min(W, H) * 0.27, cx = W / 2, cy = H * 0.54
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * R * 0.98, cy - R * 0.1)
      ctx.lineTo(cx + sx * R * 0.82, cy - R * 1.12)
      ctx.lineTo(cx + sx * R * 0.18, cy - R * 0.92)
      ctx.closePath()
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.fillStyle = '#12161b'
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + sx * R * 0.36, cy - R * 0.05, R * 0.12, R * 0.17, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(cx, cy + R * 0.42, R * 0.2, 0, Math.PI, false)
    ctx.fill()
  } else {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${H * 0.62}px "Helvetica Neue", Arial, sans-serif`
    ctx.fillText('in', W / 2, H * 0.53)
  }
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

/* ---------- vầng sáng chiếu lên tường ---------- */
let glowTex: THREE.CanvasTexture | null = null
function getGlowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(255,255,255,.55)')
  g.addColorStop(0.45, 'rgba(255,255,255,.17)')
  g.addColorStop(0.7, 'rgba(255,255,255,.04)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  return glowTex
}

type Props = { sign: Sign; active: boolean; onSelect: (id: string) => void }

function SignObject({ sign, active, onSelect }: Props) {
  const group = useRef<THREE.Group>(null)
  const face = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const capMat = useRef<THREE.MeshBasicMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const hover = useRef(0)
  const phase = useMemo(() => Math.random() * 100, [])
  const gl = useThree((s) => s.gl)
  const [w, h] = sign.size
  const boxed = !sign.hotspot && !sign.icon && sign.style !== 'inset'
  const glowing = boxed || !!sign.icon

  // kích thước khung 3D
  const t = Math.min(0.0045, h * 0.1)
  const depth = 0.008
  const faceZ = boxed ? depth / 2 + 0.0004 : 0

  const texture = useMemo(() => {
    if (sign.hotspot) return null
    const c = document.createElement('canvas')
    const cw = sign.icon ? 512 : 1536
    c.width = cw
    c.height = Math.max(96, Math.round((cw * h) / w))
    if (sign.icon) drawIcon(c, sign.icon)
    else drawSign(c, sign)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = gl.capabilities.getMaxAnisotropy()
    return tex
  }, [sign, gl, w, h])

  const frameColor = useMemo(() => new THREE.Color('#0f0f13').lerp(new THREE.Color(sign.glow ?? '#fff'), 0.05), [sign.glow])
  const slab = useMemo(() => (sign.icon ? roundedSlab(w, h, 0.008, Math.min(w, h) * 0.3) : null), [sign.icon, w, h])
  const glowColor = useMemo(() => new THREE.Color(sign.glow ?? '#ffffff'), [sign.glow])

  useEffect(() => () => texture?.dispose(), [texture])
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => { document.body.style.cursor = 'auto' }
  }, [hovered])

  useFrame(({ clock }, dt) => {
    if (sign.hotspot || !group.current || !face.current) return
    const time = clock.elapsedTime
    const f = sign.flicker ?? 0
    let k = (sign.icon ? 1.0 : 1.25) + 0.06 * Math.sin(time * 2 + phase)
    if (f > 0 && Math.sin(time * 37 + phase) * Math.sin(time * 11.3 + phase * 2) > 1 - 0.1 * f) k *= 0.35
    hover.current = THREE.MathUtils.damp(hover.current, hovered || active ? 1 : 0, 10, dt)
    k *= 1 + hover.current * 0.55
    k *= sign.icon ? 0.6 + 0.4 * live.neon : live.neon
    const mat = sign.icon ? capMat.current : (face.current.material as THREE.MeshBasicMaterial)
    mat?.color.setScalar(k)
    group.current.scale.setScalar(1 + hover.current * 0.035)
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = (0.22 + hover.current * 0.3) * (k / 1.25) * live.neon
  })

  return (
    <group
      ref={group}
      position={sign.pos}
      rotation={[0, sign.yaw, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(sign.id) }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {glowing && (
        <>
          {/* vầng sáng lên tường */}
          <mesh ref={halo} position={[0, 0, -0.001]} raycast={() => null}>
            <planeGeometry args={[w * 1.9, h * 2.7]} />
            <meshBasicMaterial map={getGlowTexture()} color={glowColor} transparent opacity={0.25} depthWrite={false}
              blending={THREE.AdditiveBlending} toneMapped={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>
        </>
      )}
      {boxed && (
        <>
          {/* khung kim loại 3D */}
          <mesh position={[0, h / 2 + t / 2, 0]}><boxGeometry args={[w + t * 2, t, depth]} /><meshBasicMaterial color={frameColor} toneMapped={false} /></mesh>
          <mesh position={[0, -h / 2 - t / 2, 0]}><boxGeometry args={[w + t * 2, t, depth]} /><meshBasicMaterial color={frameColor} toneMapped={false} /></mesh>
          <mesh position={[-w / 2 - t / 2, 0, 0]}><boxGeometry args={[t, h, depth]} /><meshBasicMaterial color={frameColor} toneMapped={false} /></mesh>
          <mesh position={[w / 2 + t / 2, 0, 0]}><boxGeometry args={[t, h, depth]} /><meshBasicMaterial color={frameColor} toneMapped={false} /></mesh>
        </>
      )}

      {sign.icon && slab ? (
        <mesh ref={face} geometry={slab}>
          <meshBasicMaterial ref={capMat} attach="material-0" map={texture} toneMapped={false} />
          <meshBasicMaterial attach="material-1" color="#101014" toneMapped={false} />
        </mesh>
      ) : (
        <mesh ref={face} position={[0, 0, faceZ]}>
          <planeGeometry args={sign.size} />
          {sign.hotspot ? (
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          ) : (
            <meshBasicMaterial map={texture} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
          )}
        </mesh>
      )}
    </group>
  )
}

export function Signs({ signs, activeId, onSelect }: { signs: Sign[]; activeId: string | null; onSelect: (id: string) => void }) {
  return (
    <>
      {signs.filter((s) => !s.kind).map((s) => (
        <SignObject key={s.id} sign={s} active={activeId === s.id} onSelect={onSelect} />
      ))}
    </>
  )
}
