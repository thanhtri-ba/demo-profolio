'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const FONT = '"Helvetica Neue", Arial, sans-serif'
const MONO = '"SF Mono", Menlo, Consolas, monospace'

type Hit = { id: string; x: number; y: number; w: number; h: number; run: () => void }

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function makeScreen(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { canvas, tex, w, h }
}

// ───────────────────────── màn hình giữa: code editor ─────────────────────────
function codeLines(): string[] {
  const p = PROFILE
  const stack = Object.values(p.skills).flat().slice(0, 6).map((s) => `"${s}"`).join(', ')
  return [
    '// profile.ts',
    'const dev = {',
    `  name: "${p.name}",`,
    `  role: "${p.role}",`,
    `  stack: [${stack}],`,
    '  ai: "LLM integration",',
    '  openToWork: true,',
    '};',
    '',
    'export function hello() {',
    '  return `Xin chào, mình là ${dev.name}`;',
    '}',
  ]
}

function colorize(ctx: CanvasRenderingContext2D, line: string, x: number, y: number, limit: number) {
  const re = /(\/\/.*$)|("[^"]*"|`[^`]*`)|\b(const|export|function|return|true|false)\b|(\w+)(?=:)|([{}[\]();,=])/g
  let last = 0, drawn = 0
  const put = (txt: string, col: string) => {
    const take = Math.max(0, Math.min(txt.length, limit - drawn))
    if (take <= 0) return
    ctx.fillStyle = col
    ctx.fillText(txt.slice(0, take), x + drawn * 13.2, y)
    drawn += take
  }
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) put(line.slice(last, m.index), '#d6d9f5')
    const col = m[1] ? '#6b7394' : m[2] ? '#ffd34d' : m[3] ? '#ff6fe0' : m[4] ? '#7ff6ff' : '#9aa4d6'
    put(m[0], col)
    last = m.index + m[0].length
  }
  if (last < line.length) put(line.slice(last), '#d6d9f5')
}

function drawCode(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#0d1020'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#151a30'; ctx.fillRect(0, 0, W, 46)
  ctx.font = `600 18px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillStyle = '#1d2342'; rr(ctx, 14, 8, 150, 32, 8); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.fillText('● profile.ts', 28, 24)
  ctx.fillStyle = '#6b7394'; ctx.fillText('index.tsx', 190, 24)
  ctx.fillStyle = '#11162b'; ctx.fillRect(0, 46, 64, H - 46)
  const lines = codeLines()
  const total = lines.reduce((a, l) => a + l.length + 1, 0)
  const typed = Math.floor(t * 26) % (total + 70)
  let left = Math.min(typed, total)
  ctx.font = `500 22px ${MONO}`
  let cursor = { x: 0, y: 0 }
  lines.forEach((ln, i) => {
    const y = 84 + i * 30
    ctx.fillStyle = '#3a4268'; ctx.textAlign = 'right'; ctx.fillText(String(i + 1), 48, y)
    ctx.textAlign = 'left'
    const take = Math.max(0, Math.min(ln.length, left))
    colorize(ctx, ln, 80, y, take)
    if (left >= 0 && left <= ln.length) cursor = { x: 80 + take * 13.2, y }
    left -= ln.length + 1
  })
  if (Math.floor(t * 2) % 2 === 0 && typed < total + 40) { ctx.fillStyle = '#7ff6ff'; ctx.fillRect(cursor.x + 1, cursor.y - 13, 3, 26) }
  ctx.fillStyle = '#ff3fd0'; ctx.fillRect(0, H - 30, W, 30)
  ctx.fillStyle = '#fff'; ctx.font = `600 16px ${FONT}`; ctx.textAlign = 'left'
  ctx.fillText('  main   TypeScript   UTF-8   Ln 12', 10, H - 15)
}

// ───────────────────────── màn hình trái: dự án ─────────────────────────
function drawProjects(ctx: CanvasRenderingContext2D, W: number, H: number, hover: string | null): Hit[] {
  const hits: Hit[] = []
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#120a26'); bg.addColorStop(1, '#0a0716')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'; ctx.font = `800 36px ${FONT}`; ctx.fillText('Projects', 28, 44)
  ctx.fillStyle = '#9a8fc4'; ctx.font = `500 17px ${FONT}`; ctx.fillText('Bấm một dự án để mở link', 30, 80)
  PROFILE.projects.slice(0, 4).forEach((pr, i) => {
    const y = 112 + i * 100, hv = hover === `p${i}`
    ctx.fillStyle = hv ? 'rgba(255,63,208,.26)' : 'rgba(255,255,255,.07)'
    rr(ctx, 24, y, W - 48, 86, 16); ctx.fill()
    ctx.fillStyle = `hsl(${300 - i * 45},100%,60%)`; rr(ctx, 24, y, 6, 86, 3); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`; ctx.fillText(pr.title, 48, y + 26)
    ctx.fillStyle = '#c9b8e8'; ctx.font = `500 16px ${FONT}`
    ctx.fillText((pr.desc ?? '').slice(0, 40), 48, y + 52)
    ctx.fillStyle = '#7ff6ff'; ctx.font = `600 14px ${MONO}`; ctx.fillText(pr.meta ?? '', 48, y + 73)
    hits.push({ id: `p${i}`, x: 24, y, w: W - 48, h: 86, run: () => { if (pr.href) window.open(pr.href, '_blank', 'noopener') } })
  })
  return hits
}

// ───────────────────────── màn hình phải: Neon Snake ─────────────────────────
const COLS = 26, ROWS = 15, CELL = 24
type V = { x: number; y: number }
type Game = { state: 'idle' | 'play' | 'over'; snake: V[]; dir: V; next: V; food: V; score: number; best: number; acc: number }

function newGame(best = 0): Game {
  return { state: 'idle', snake: [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 16, y: 7 }, score: 0, best, acc: 0 }
}
function spawnFood(g: Game) {
  for (let k = 0; k < 200; k++) {
    const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    if (!g.snake.some((s) => s.x === f.x && s.y === f.y)) { g.food = f; return }
  }
}
function stepGame(g: Game) {
  g.dir = g.next
  const h = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }
  if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || g.snake.some((s) => s.x === h.x && s.y === h.y)) {
    g.state = 'over'; g.best = Math.max(g.best, g.score); return
  }
  g.snake.unshift(h)
  if (h.x === g.food.x && h.y === g.food.y) { g.score++; spawnFood(g) } else g.snake.pop()
}
function steer(g: Game, d: V) {
  if (d.x === -g.dir.x && d.y === -g.dir.y) return
  g.next = d
}

function drawSnake(ctx: CanvasRenderingContext2D, W: number, H: number, g: Game, t: number) {
  ctx.fillStyle = '#06130f'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#0b2a20'; ctx.fillRect(0, 0, W, 40)
  ctx.font = `700 18px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#7fffc0'
  ctx.fillText('NEON SNAKE', 16, 20)
  ctx.textAlign = 'right'; ctx.fillStyle = '#c8ffe6'
  ctx.fillText(`Điểm ${g.score}   Kỷ lục ${g.best}`, W - 16, 20)
  const ox = (W - COLS * CELL) / 2, oy = 40 + (H - 40 - ROWS * CELL) / 2
  ctx.strokeStyle = 'rgba(80,255,170,.07)'; ctx.lineWidth = 1
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(ox + x * CELL, oy); ctx.lineTo(ox + x * CELL, oy + ROWS * CELL); ctx.stroke() }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * CELL); ctx.lineTo(ox + COLS * CELL, oy + y * CELL); ctx.stroke() }
  ctx.strokeStyle = '#22ff88'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, COLS * CELL, ROWS * CELL)
  // mồi
  const pulse = 0.75 + 0.25 * Math.sin(t * 8)
  ctx.fillStyle = '#ff3fa8'; ctx.shadowColor = '#ff3fa8'; ctx.shadowBlur = 16
  ctx.beginPath(); ctx.arc(ox + (g.food.x + 0.5) * CELL, oy + (g.food.y + 0.5) * CELL, CELL * 0.34 * pulse + 2, 0, Math.PI * 2); ctx.fill()
  // rắn
  g.snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#eafff5' : `hsl(${150 - i * 3},100%,${58 - Math.min(i, 20)}%)`
    ctx.shadowColor = '#22ff88'; ctx.shadowBlur = i === 0 ? 18 : 8
    rr(ctx, ox + s.x * CELL + 2, oy + s.y * CELL + 2, CELL - 4, CELL - 4, 6); ctx.fill()
  })
  ctx.shadowBlur = 0
  if (g.state !== 'play') {
    ctx.fillStyle = 'rgba(2,12,8,.72)'; ctx.fillRect(ox, oy, COLS * CELL, ROWS * CELL)
    ctx.textAlign = 'center'; ctx.fillStyle = '#eafff5'
    ctx.font = `800 34px ${FONT}`
    ctx.fillText(g.state === 'over' ? 'GAME OVER' : 'NEON SNAKE', W / 2, oy + ROWS * CELL / 2 - 22)
    ctx.font = `600 18px ${FONT}`; ctx.fillStyle = '#7fffc0'
    ctx.fillText(g.state === 'over' ? `Điểm: ${g.score} · bấm để chơi lại` : 'Bấm vào màn hình để chơi', W / 2, oy + ROWS * CELL / 2 + 16)
    ctx.fillStyle = '#9ad8b8'; ctx.font = `500 15px ${FONT}`
    ctx.fillText('Điều khiển: ← ↑ ↓ → hoặc WASD (bấm vào màn hình để rẽ hướng trên điện thoại)', W / 2, oy + ROWS * CELL / 2 + 46)
  }
}

// ───────────────────────── bàn phím RGB ─────────────────────────
function drawKeys(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#0c0c14'; ctx.fillRect(0, 0, W, H)
  const rows = [14, 14, 13, 12, 8]
  const kh = H / rows.length
  rows.forEach((n, r) => {
    const kw = W / n
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `hsl(${(t * 60 + i * 14 + r * 22) % 360},100%,48%)`
      rr(ctx, i * kw + 2, r * kh + 3, kw - 4, kh - 6, 4)
      ctx.fill()
    }
  })
}

/**
 * "Bàn máy tính của tôi": 3 màn hình (code, dự án, game Neon Snake), tower RGB, bàn phím RGB.
 * Đặt ở góc đen bên phải phố; bấm vào PC mini trên đường để camera bay tới đây.
 */
export function Desk({ position, yaw, active, onActivate }: {
  position: [number, number, number]; yaw: number; active: boolean; onActivate: () => void
}) {
  const glow = useMemo(() => glowTexture(), [])
  const code = useMemo(() => makeScreen(768, 480), [])
  const proj = useMemo(() => makeScreen(512, 512), [])
  const snk = useMemo(() => makeScreen(640, 400), [])
  const keys = useMemo(() => makeScreen(512, 160), [])
  const game = useRef<Game>(newGame())
  const hits = useRef<Hit[]>([])
  const hover = useRef<string | null>(null)
  const fan = useRef<THREE.Mesh[]>([])
  const strip = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const frame = useRef(0)
  const root = useRef<THREE.Group>(null)
  const posVec = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const map: Record<string, V> = { arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 } }
      const d = map[k]
      if (d) {
        e.preventDefault(); e.stopPropagation()
        const g = game.current
        if (g.state !== 'play') { const b = g.best; game.current = newGame(b); game.current.state = 'play' }
        steer(game.current, d)
      }
      if (e.key === ' ' && game.current.state !== 'play') { e.preventDefault(); const b = game.current.best; game.current = newGame(b); game.current.state = 'play' }
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [active])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    const g = game.current
    if (g.state === 'play') {
      g.acc += dt
      const stepT = Math.max(0.065, 0.13 - g.score * 0.003)
      while (g.acc > stepT && g.state === 'play') { g.acc -= stepT; stepGame(g) }
    }
    const near = active
    if (root.current) root.current.visible = active
    const every = active ? 2 : near ? 6 : 30
    if (frame.current % every === 0) {
      let c = code.canvas.getContext('2d')!
      drawCode(c, code.w, code.h, t); code.tex.needsUpdate = true
      c = proj.canvas.getContext('2d')!
      hits.current = drawProjects(c, proj.w, proj.h, hover.current); proj.tex.needsUpdate = true
      c = snk.canvas.getContext('2d')!
      drawSnake(c, snk.w, snk.h, g, t); snk.tex.needsUpdate = true
      c = keys.canvas.getContext('2d')!
      drawKeys(c, keys.w, keys.h, t); keys.tex.needsUpdate = true
    }
    fan.current.forEach((m, i) => {
      if (!m) return
      m.rotation.z = t * (2 + i * 0.4)
      ;(m.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.15 + i * 0.12) % 1, 1, 0.55).multiplyScalar(live.neon + 0.3)
    })
    if (strip.current) (strip.current.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.2) % 1, 1, 0.55).multiplyScalar(live.neon + 0.3)
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = (0.22 + 0.08 * Math.sin(t * 2)) * live.neon
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) => (uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null)

  const screenProps = (kind: 'code' | 'proj' | 'snake') => ({
    onClick: (e: { stopPropagation: () => void; uv?: THREE.Vector2 }) => {
      e.stopPropagation()
      if (!active) { onActivate(); return }
      if (kind === 'proj') {
        const p = uvToXY(e.uv, proj.w, proj.h)
        if (p) hits.current.find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h)?.run()
      } else if (kind === 'snake') {
        const g = game.current
        if (g.state !== 'play') { const b = g.best; game.current = newGame(b); game.current.state = 'play'; return }
        // chạm để rẽ: hướng từ đầu rắn tới điểm chạm
        const p = uvToXY(e.uv, snk.w, snk.h)
        if (!p) return
        const ox = (snk.w - COLS * CELL) / 2, oy = 40 + (snk.h - 40 - ROWS * CELL) / 2
        const dx = (p.x - ox) / CELL - (g.snake[0].x + 0.5), dy = (p.y - oy) / CELL - (g.snake[0].y + 0.5)
        steer(g, Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 })
      }
    },
    onPointerMove: (e: { stopPropagation: () => void; uv?: THREE.Vector2 }) => {
      e.stopPropagation()
      let h: string | null = null
      if (active && kind === 'proj') {
        const p = uvToXY(e.uv, proj.w, proj.h)
        if (p) h = hits.current.find((x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h)?.id ?? null
      }
      hover.current = h
      document.body.style.cursor = !active || h || (active && kind === 'snake') ? 'pointer' : 'default'
    },
    onPointerOut: () => { hover.current = null; document.body.style.cursor = '' },
  })

  const metal = '#14141c'

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* vầng sáng nền */}
      <mesh ref={halo} position={[0, 0.15, -0.35]} raycast={() => null}>
        <planeGeometry args={[2.6, 1.5]} />
        <meshBasicMaterial map={glow} color="#7b3bff" transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* sàn + vệt sáng */}
      <mesh position={[0, -0.399, 0.2]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshBasicMaterial map={glow} color="#ff3fd0" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* mặt bàn + chân bàn */}
      <RoundedBox args={[1.5, 0.035, 0.62]} radius={0.01} smoothness={2} position={[0, -0.0175, 0.12]} raycast={() => null}>
        <meshBasicMaterial color="#1a1a26" toneMapped={false} />
      </RoundedBox>
      <mesh position={[0, -0.0345, 0.4355]} raycast={() => null}>
        <boxGeometry args={[1.5, 0.004, 0.004]} />
        <meshBasicMaterial color="#7b3bff" toneMapped={false} />
      </mesh>
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, -0.215, 0.12]} raycast={() => null}>
          <boxGeometry args={[0.035, 0.37, 0.5]} />
          <meshBasicMaterial color="#111119" toneMapped={false} />
        </mesh>
      ))}

      {/* thảm chuột + bàn phím + chuột */}
      <mesh position={[0, 0.0008, 0.27]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[0.95, 0.3]} />
        <meshBasicMaterial color="#0a0a12" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.011, 0.3]} rotation-x={-Math.PI / 2 + 0.12} raycast={() => null}>
        <planeGeometry args={[0.46, 0.145]} />
        <meshBasicMaterial map={keys.tex} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.05, 0.016, 0.085]} radius={0.008} smoothness={2} position={[0.34, 0.009, 0.3]} raycast={() => null}>
        <meshBasicMaterial color="#1b1b27" toneMapped={false} />
      </RoundedBox>
      <mesh ref={strip} position={[0.34, 0.0015, 0.3]} raycast={() => null}>
        <boxGeometry args={[0.052, 0.002, 0.087]} />
        <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
      </mesh>

      {/* màn hình giữa */}
      <group position={[0, 0.25, -0.02]}>
        <RoundedBox args={[0.74, 0.46, 0.03]} radius={0.012} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={metal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0155]} {...screenProps('code')}>
          <planeGeometry args={[0.7, 0.4375]} />
          <meshBasicMaterial map={code.tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.255, -0.02]} raycast={() => null}>
          <boxGeometry args={[0.06, 0.07, 0.03]} />
          <meshBasicMaterial color="#1b1b27" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.285, 0.0]} raycast={() => null}>
          <boxGeometry args={[0.26, 0.008, 0.14]} />
          <meshBasicMaterial color="#1b1b27" toneMapped={false} />
        </mesh>
      </group>

      {/* màn hình trái: dự án */}
      <group position={[-0.62, 0.23, 0.06]} rotation-y={0.5}>
        <RoundedBox args={[0.46, 0.46, 0.028]} radius={0.012} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={metal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0145]} {...screenProps('proj')}>
          <planeGeometry args={[0.42, 0.42]} />
          <meshBasicMaterial map={proj.tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.26, -0.015]} raycast={() => null}>
          <boxGeometry args={[0.05, 0.06, 0.025]} />
          <meshBasicMaterial color="#1b1b27" toneMapped={false} />
        </mesh>
      </group>

      {/* màn hình phải: game */}
      <group position={[0.62, 0.23, 0.06]} rotation-y={-0.5}>
        <RoundedBox args={[0.5, 0.33, 0.028]} radius={0.012} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={metal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0145]} {...screenProps('snake')}>
          <planeGeometry args={[0.46, 0.2875]} />
          <meshBasicMaterial map={snk.tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.2, -0.015]} raycast={() => null}>
          <boxGeometry args={[0.05, 0.07, 0.025]} />
          <meshBasicMaterial color="#1b1b27" toneMapped={false} />
        </mesh>
      </group>

      {/* PC tower trên sàn bên phải */}
      <group position={[0.98, -0.2, 0.12]} rotation-y={-0.25}>
        <RoundedBox args={[0.22, 0.4, 0.4]} radius={0.01} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#0d0d15" toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.2005]} raycast={() => null}>
          <planeGeometry args={[0.2, 0.38]} />
          <meshBasicMaterial color="#05050a" toneMapped={false} />
        </mesh>
        {[0.12, 0, -0.12].map((y, i) => (
          <mesh key={i} ref={(el) => { if (el) fan.current[i] = el }} position={[0, y, 0.2015]} raycast={() => null}>
            <torusGeometry args={[0.045, 0.006, 8, 32]} />
            <meshBasicMaterial color="#ff3fd0" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0.1005, 0, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.36, 0.34]} />
          <meshBasicMaterial map={glow} color="#7b3bff" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

