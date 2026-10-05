'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const FONT = '"Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif'
const MONO = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace'

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
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { canvas, tex, w, h }
}

// ───────────────────────── MÀN HÌNH GIỮA: VS CODE TOKYO NIGHT ─────────────────────────
function codeLines(): string[] {
  const p = PROFILE
  return [
    '// ⚡ Phạm Thành Trí — Senior Full-Stack & 3D Web Creative',
    'import { defineProfile, type Engineer } from "@/core/dev"',
    '',
    'export const developer: Engineer = {',
    `  name: "${p.name}",`,
    `  role: "${p.role}",`,
    '  coreStack: ["Next.js 16", "React Three Fiber", "Three.js / WebGL", ".NET Core"],',
    '  aiCapabilities: ["LLM Integration", "Agentic Workflows", "Vector Search"],',
    '  openToWork: true,',
    '  systemPerformance: { fps: 120, latency: "14ms", status: "OPTIMIZED" },',
    '};',
    '',
    'export async function initCyberpunkWorld(): Promise<void> {',
    '  console.log(`[BOOT] Welcome to ${developer.name}\'s 3D Dimension`);',
    '  await WebGLRenderer.compile({ shaders: "Cinematic", antialias: true });',
    '}',
  ]
}

function colorize(ctx: CanvasRenderingContext2D, line: string, x: number, y: number, limit: number) {
  const re = /(\/\/.*$)|("[^"]*"|`[^`]*`)|\b(import|from|export|const|async|function|return|true|false|type)\b|(\w+)(?=:)|([{}[\]();,=<>*])/g
  let last = 0, drawn = 0
  const put = (txt: string, col: string) => {
    const take = Math.max(0, Math.min(txt.length, limit - drawn))
    if (take <= 0) return
    ctx.fillStyle = col
    ctx.fillText(txt.slice(0, take), x + drawn * 11.2, y)
    drawn += take
  }
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) put(line.slice(last, m.index), '#c0caf5')
    const col = m[1] ? '#565f89' : m[2] ? '#9ece6a' : m[3] ? '#bb9af7' : m[4] ? '#7aa2f7' : '#7dcfff'
    put(m[0], col)
    last = m.index + m[0].length
  }
  if (last < line.length) put(line.slice(last), '#c0caf5')
}

function drawCode(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Nền Tokyo Night sâu thẳm
  ctx.fillStyle = '#0f111a'
  ctx.fillRect(0, 0, W, H)

  // Title bar macOS phong cách Cyber
  ctx.fillStyle = '#161926'
  ctx.fillRect(0, 0, W, 48)

  // Nút Window Controls (Đỏ, Vàng, Xanh phát sáng)
  const dots = ['#ff5f56', '#ffbd2e', '#27c93f']
  dots.forEach((color, i) => {
    ctx.beginPath()
    ctx.arc(22 + i * 20, 24, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  })

  // Tabs VS Code
  // Tab 1 (Active): profile.ts
  ctx.fillStyle = '#1f2335'
  rr(ctx, 88, 8, 175, 40, 8)
  ctx.fill()
  // Đường gạch viền trên tab active
  ctx.fillStyle = '#7aa2f7'
  ctx.fillRect(96, 8, 159, 2)

  ctx.font = `600 15px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#7aa2f7'
  ctx.fillText('TS', 104, 25)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('profile.ts', 132, 25)
  ctx.fillStyle = '#7aa2f7'
  ctx.fillText('✕', 242, 25)

  // Tab 2: Scene.tsx
  ctx.fillStyle = '#141724'
  rr(ctx, 270, 8, 150, 40, 8)
  ctx.fill()
  ctx.fillStyle = '#00f5d4'
  ctx.fillText('⚛', 282, 25)
  ctx.fillStyle = '#787c99'
  ctx.fillText('Scene.tsx', 304, 25)

  // Tab 3: terminal.sh
  ctx.fillStyle = '#141724'
  rr(ctx, 426, 8, 145, 40, 8)
  ctx.fill()
  ctx.fillStyle = '#ffd60a'
  ctx.fillText('$_', 438, 25)
  ctx.fillStyle = '#787c99'
  ctx.fillText('terminal.sh', 464, 25)

  // Breadcrumbs bar
  ctx.fillStyle = '#141724'
  ctx.fillRect(0, 48, W, 28)
  ctx.font = `500 12.5px ${MONO}`
  ctx.fillStyle = '#565f89'
  ctx.fillText('portfolio  ›  src  ›  components  ›  ', 70, 62)
  ctx.fillStyle = '#9aa5ce'
  ctx.fillText('profile.ts', 286, 62)

  // Sidebar mini Explorer
  ctx.fillStyle = '#12141f'
  ctx.fillRect(0, 48, 54, H - 48 - 28)
  // Các icon sidebar
  const sideIcons = ['📄', '🔍', '⎇', '🐞', '📦']
  sideIcons.forEach((icon, i) => {
    ctx.font = '16px system-ui'
    ctx.textAlign = 'center'
    ctx.fillStyle = i === 0 ? '#7aa2f7' : '#414868'
    ctx.fillText(icon, 27, 85 + i * 44)
    if (i === 0) {
      ctx.fillStyle = '#7aa2f7'
      ctx.fillRect(0, 68 + i * 44, 3, 34)
    }
  })

  // Nội dung Code & Số dòng
  const lines = codeLines()
  const total = lines.reduce((a, l) => a + l.length + 1, 0)
  const typed = Math.floor(t * 30) % (total + 80)
  let left = Math.min(typed, total)
  ctx.font = `500 18.5px ${MONO}`
  let cursor = { x: 0, y: 0 }

  lines.forEach((ln, i) => {
    const y = 106 + i * 31
    // Dòng đang active highlight
    if (left >= 0 && left <= ln.length) {
      ctx.fillStyle = 'rgba(122, 162, 247, 0.08)'
      ctx.fillRect(54, y - 16, W - 140, 31)
    }

    ctx.fillStyle = '#3b4261'
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), 90, y)

    ctx.textAlign = 'left'
    const take = Math.max(0, Math.min(ln.length, left))
    colorize(ctx, ln, 108, y, take)
    if (left >= 0 && left <= ln.length) {
      cursor = { x: 108 + take * 11.2, y }
    }
    left -= ln.length + 1
  })

  // Con trỏ nhấp nháy Neon Cyan
  if (Math.floor(t * 2.5) % 2 === 0 && typed < total + 50) {
    ctx.fillStyle = '#00f5d4'
    ctx.shadowColor = '#00f5d4'
    ctx.shadowBlur = 10
    ctx.fillRect(cursor.x + 2, cursor.y - 14, 2.5, 23)
    ctx.shadowBlur = 0
  }

  // Minimap mô phỏng bên phải
  const mmW = 75
  const mmX = W - mmW
  ctx.fillStyle = 'rgba(18, 20, 31, 0.7)'
  ctx.fillRect(mmX, 48, mmW, H - 48 - 28)
  lines.forEach((ln, i) => {
    const my = 85 + i * 9
    const mw = Math.min(50, ln.length * 1.2)
    ctx.fillStyle = i % 2 === 0 ? 'rgba(122, 162, 247, 0.25)' : 'rgba(158, 206, 106, 0.25)'
    ctx.fillRect(mmX + 10, my, mw, 4)
  })
  // Viewport rectangle trong minimap
  ctx.strokeStyle = 'rgba(122, 162, 247, 0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(mmX + 6, 80, mmW - 12, 150)

  // Status Bar bên dưới
  ctx.fillStyle = '#00f5d4'
  ctx.fillRect(0, H - 28, W, 28)
  ctx.fillStyle = '#07090e'
  ctx.font = `700 12.5px ${MONO}`
  ctx.textAlign = 'left'
  ctx.fillText(' ⎇ main*   ✓ READY   UTF-8   TypeScript 5.8   Ln 14, Col 28', 12, H - 14)
  ctx.textAlign = 'right'
  ctx.fillText('120 FPS · 3D ENGINE ACTIVE · TURBOPACK  ', W - 12, H - 14)
}

// ───────────────────────── MÀN HÌNH TRÁI: DỰ ÁN GLASSMORPHISM ─────────────────────────
function drawProjects(ctx: CanvasRenderingContext2D, W: number, H: number, hover: string | null): Hit[] {
  const hits: Hit[] = []

  // Nền Gradient Cyberpunk Dark
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0c0e18')
  bg.addColorStop(0.5, '#121626')
  bg.addColorStop(1, '#080a12')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Viền sáng trang trí góc trên
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)'
  ctx.lineWidth = 2
  ctx.strokeRect(16, 16, W - 32, H - 32)

  // Header HUD
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#00f5d4'
  ctx.font = `800 13px ${MONO}`
  ctx.fillText('// FEATURED REPOSITORIES', 32, 42)

  ctx.fillStyle = '#ffffff'
  ctx.font = `800 32px ${FONT}`
  ctx.fillText('Dự Án Nổi Bật', 32, 75)

  ctx.fillStyle = '#8b9bb4'
  ctx.font = `500 14px ${FONT}`
  ctx.fillText('Nhấp vào thẻ dự án để mở mã nguồn & demo', 32, 104)

  const colors = ['#00f5d4', '#ff007f', '#ffd60a', '#7928ca']
  const badges = ['3D WEB', 'EXPERIENCE', 'FULL-STACK', 'AI BOT']

  PROFILE.projects.slice(0, 4).forEach((pr, i) => {
    const y = 132 + i * 118
    const hv = hover === `p${i}`
    const col = colors[i % colors.length]

    // Card Glassmorphism
    ctx.fillStyle = hv ? 'rgba(25, 32, 54, 0.95)' : 'rgba(16, 21, 38, 0.78)'
    rr(ctx, 32, y, W - 64, 104, 14)
    ctx.fill()

    // Border phát sáng khi hover
    ctx.strokeStyle = hv ? col : 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = hv ? 2 : 1
    rr(ctx, 32, y, W - 64, 104, 14)
    ctx.stroke()

    // Thanh màu định danh bên trái
    ctx.fillStyle = col
    if (hv) {
      ctx.shadowColor = col
      ctx.shadowBlur = 14
    }
    rr(ctx, 32, y, 6, 104, 3)
    ctx.fill()
    ctx.shadowBlur = 0

    // Badge danh mục
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    rr(ctx, 52, y + 16, 76, 20, 6)
    ctx.fill()
    ctx.fillStyle = col
    ctx.font = `700 10.5px ${MONO}`
    ctx.textAlign = 'center'
    ctx.fillText(badges[i], 90, y + 26)

    // Tiêu đề dự án
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 20px ${FONT}`
    ctx.fillText(pr.title, 140, y + 26)

    // Mô tả dự án
    ctx.fillStyle = '#94a3b8'
    ctx.font = `500 13.5px ${FONT}`
    ctx.fillText((pr.desc ?? '').slice(0, 42) + '...', 52, y + 56)

    // Tech Stack Metadata
    ctx.fillStyle = '#7dd3fc'
    ctx.font = `600 12px ${MONO}`
    ctx.fillText(pr.meta ?? '', 52, y + 82)

    // Nút Open icon góc phải
    ctx.fillStyle = hv ? col : 'rgba(255, 255, 255, 0.12)'
    rr(ctx, W - 100, y + 36, 56, 32, 8)
    ctx.fill()
    ctx.fillStyle = hv ? '#07090e' : '#e2e8f0'
    ctx.font = `700 13px ${MONO}`
    ctx.textAlign = 'center'
    ctx.fillText('MỞ ↗', W - 72, y + 52)

    hits.push({
      id: `p${i}`,
      x: 32,
      y,
      w: W - 64,
      h: 104,
      run: () => {
        if (pr.href) window.open(pr.href, '_blank', 'noopener')
      },
    })
  })

  return hits
}

// ───────────────────────── MÀN HÌNH PHẢI: NEON SNAKE ARCADE 2077 ─────────────────────────
const COLS = 26, ROWS = 15, CELL = 26
type V = { x: number; y: number }
type Game = {
  state: 'idle' | 'play' | 'over'
  snake: V[]
  dir: V
  next: V
  food: V
  score: number
  best: number
  acc: number
}

function newGame(best = 0): Game {
  return {
    state: 'idle',
    snake: [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }],
    dir: { x: 1, y: 0 },
    next: { x: 1, y: 0 },
    food: { x: 16, y: 7 },
    score: 0,
    best,
    acc: 0,
  }
}

function spawnFood(g: Game) {
  for (let k = 0; k < 200; k++) {
    const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    if (!g.snake.some((s) => s.x === f.x && s.y === f.y)) {
      g.food = f
      return
    }
  }
}

function stepGame(g: Game) {
  g.dir = g.next
  const h = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }
  if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || g.snake.some((s) => s.x === h.x && s.y === h.y)) {
    g.state = 'over'
    g.best = Math.max(g.best, g.score)
    return
  }
  g.snake.unshift(h)
  if (h.x === g.food.x && h.y === g.food.y) {
    g.score++
    spawnFood(g)
  } else {
    g.snake.pop()
  }
}

function steer(g: Game, d: V) {
  if (d.x === -g.dir.x && d.y === -g.dir.y) return
  g.next = d
}

function drawSnake(ctx: CanvasRenderingContext2D, W: number, H: number, g: Game, t: number) {
  // Nền Arcade Console
  ctx.fillStyle = '#050d0a'
  ctx.fillRect(0, 0, W, H)

  // Header Dashboard
  ctx.fillStyle = '#0a1d15'
  ctx.fillRect(0, 0, W, 52)
  ctx.fillStyle = '#00ff88'
  ctx.fillRect(0, 50, W, 2)

  ctx.font = `800 17px ${MONO}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#00ff88'
  ctx.fillText('🕹️ NEON SNAKE 2077 // ARCADE EDITION', 22, 26)

  // Bảng điểm số kỹ thuật số LCD
  ctx.textAlign = 'right'
  ctx.fillStyle = '#79ffe1'
  ctx.fillText(
    `SCORE: ${String(g.score).padStart(2, '0')}    HIGH: ${String(g.best).padStart(2, '0')}`,
    W - 22,
    26
  )

  const ox = (W - COLS * CELL) / 2
  const oy = 52 + (H - 52 - ROWS * CELL) / 2

  // Lưới Ma trận phát sáng
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)'
  ctx.lineWidth = 1
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(ox + x * CELL, oy)
    ctx.lineTo(ox + x * CELL, oy + ROWS * CELL)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(ox, oy + y * CELL)
    ctx.lineTo(ox + COLS * CELL, oy + y * CELL)
    ctx.stroke()
  }

  // Khung viền sân đấu Neon
  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 2
  ctx.strokeRect(ox, oy, COLS * CELL, ROWS * CELL)

  // Quả cầu năng lượng (Mồi)
  const pulse = 0.8 + 0.25 * Math.sin(t * 9)
  const fx = ox + (g.food.x + 0.5) * CELL
  const fy = oy + (g.food.y + 0.5) * CELL

  // Vầng hào quang ngoài của mồi
  ctx.fillStyle = 'rgba(255, 0, 128, 0.25)'
  ctx.beginPath()
  ctx.arc(fx, fy, CELL * 0.7 * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ff007f'
  ctx.shadowColor = '#ff007f'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.arc(fx, fy, CELL * 0.38 * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Con rắn Cyber
  g.snake.forEach((s, i) => {
    const isHead = i === 0
    const color = isHead ? '#ffffff' : `hsl(${160 - i * 4}, 100%, ${55 - Math.min(i, 20)}%)`
    ctx.fillStyle = color
    ctx.shadowColor = isHead ? '#00f5d4' : '#00ff88'
    ctx.shadowBlur = isHead ? 20 : 10
    rr(ctx, ox + s.x * CELL + 2.5, oy + s.y * CELL + 2.5, CELL - 5, CELL - 5, isHead ? 8 : 5)
    ctx.fill()

    // Vẽ mắt phát sáng cho đầu rắn
    if (isHead) {
      ctx.fillStyle = '#07090e'
      ctx.beginPath()
      ctx.arc(ox + s.x * CELL + CELL / 2, oy + s.y * CELL + CELL / 2, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.shadowBlur = 0

  // Màn hình Start hoặc Game Over
  if (g.state !== 'play') {
    ctx.fillStyle = 'rgba(5, 14, 10, 0.86)'
    ctx.fillRect(ox, oy, COLS * CELL, ROWS * CELL)

    ctx.textAlign = 'center'
    if (g.state === 'over') {
      ctx.fillStyle = '#ff0055'
      ctx.shadowColor = '#ff0055'
      ctx.shadowBlur = 24
      ctx.font = `800 42px ${FONT}`
      ctx.fillText('MISSION FAILED', W / 2, oy + (ROWS * CELL) / 2 - 32)
      ctx.shadowBlur = 0

      ctx.font = `700 22px ${MONO}`
      ctx.fillStyle = '#ffd60a'
      ctx.fillText(`KẾT QUẢ: ${g.score} ĐIỂM  ·  KỶ LỤC: ${g.best}`, W / 2, oy + (ROWS * CELL) / 2 + 12)
    } else {
      ctx.fillStyle = '#00ff88'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 24
      ctx.font = `800 40px ${FONT}`
      ctx.fillText('NEON SNAKE 2077', W / 2, oy + (ROWS * CELL) / 2 - 32)
      ctx.shadowBlur = 0

      ctx.font = `600 18px ${FONT}`
      ctx.fillStyle = '#79ffe1'
      ctx.fillText('BẤM VÀO MÀN HÌNH HOẶC NHẤN SPACE ĐỂ CHƠI', W / 2, oy + (ROWS * CELL) / 2 + 12)
    }

    // Nút điều khiển hướng dẫn
    ctx.font = `500 14px ${MONO}`
    ctx.fillStyle = '#82aaff'
    ctx.fillText('PHÍM: [W] [A] [S] [D] HOẶC MŨI TÊN (ĐIỆN THOẠI: CHẠM MÀN HÌNH ĐỂ RẼ)', W / 2, oy + (ROWS * CELL) / 2 + 48)
  }
}

// ───────────────────────── BÀN PHÍM CƠ RGB & THẢM CHUỘT CIRCUIT ─────────────────────────
function drawKeys(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#090a10'
  ctx.fillRect(0, 0, W, H)

  // Layout 75% Mechanical Keyboard
  const rows = [15, 15, 14, 14, 9]
  const rowLabels = [
    ['ESC', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'DEL', 'RGB'],
    ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACK', 'PGUP'],
    ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\', 'PGDN'],
    ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER', 'END'],
    ['CTRL', 'WIN', 'ALT', '       SPACEBAR       ', 'ALT', 'FN', '◀', '▲', '▶'],
  ]

  const kh = H / rows.length
  rows.forEach((n, r) => {
    const kw = W / n
    for (let i = 0; i < n; i++) {
      const isSpecial = (r === 2 && (i === 2 || i === 3 || i === 4)) || (r === 3 && (i === 1 || i === 2 || i === 3)) // WASD
      const hue = (t * 70 + i * 18 + r * 30) % 360

      // Khung phím bấm cơ
      ctx.fillStyle = isSpecial ? 'rgba(0, 245, 212, 0.85)' : `hsl(${hue}, 95%, 48%)`
      rr(ctx, i * kw + 3, r * kh + 3, kw - 6, kh - 6, 5)
      ctx.fill()

      // Mặt trong keycap
      ctx.fillStyle = '#121420'
      rr(ctx, i * kw + 5, r * kh + 5, kw - 10, kh - 10, 4)
      ctx.fill()

      // Legend chữ trên phím
      const label = rowLabels[r]?.[i] ?? ''
      ctx.font = `700 ${kw < 40 ? '9px' : '11px'} ${MONO}`
      ctx.fillStyle = isSpecial ? '#00f5d4' : `hsl(${hue}, 90%, 75%)`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, i * kw + kw / 2, r * kh + kh / 2)
    }
  })
}

function drawDeskmat(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Nền thảm tối cao cấp
  ctx.fillStyle = '#080910'
  ctx.fillRect(0, 0, W, H)

  // Viền khâu RGB chạy quanh thảm
  ctx.strokeStyle = 'rgba(123, 59, 255, 0.45)'
  ctx.lineWidth = 4
  rr(ctx, 4, 4, W - 8, H - 8, 12)
  ctx.stroke()

  // Các đường vi mạch công nghệ Cyber Circuit in chìm
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.12)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 50
    ctx.beginPath()
    ctx.moveTo(20, y)
    ctx.lineTo(120 + i * 40, y)
    ctx.lineTo(160 + i * 40, y + 25)
    ctx.lineTo(W - 80, y + 25)
    ctx.stroke()

    // Điểm node vi mạch
    ctx.fillStyle = 'rgba(0, 245, 212, 0.3)'
    ctx.beginPath()
    ctx.arc(160 + i * 40, y + 25, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Logo Cyber Dev in góc phải
  ctx.font = `700 13px ${MONO}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('CYBERPUNK BATTLESTATION // ED. 2026', W - 24, H - 16)
}

/**
 * Battlestation nâng cấp toàn diện:
 * - 3 màn hình siêu nét (Tokyo Night VS Code, Glassmorphism Projects, Arcade Neon Snake).
 * - Bàn phím cơ RGB có legends từng phím, thảm lót chuột vi mạch Cyber Circuit.
 * - Ambilight viền sau màn hình, tản nhiệt AIO có màn hình LCD nhiệt độ, RAM RGB.
 * - Tường phòng Cyberpunk Battlestation phía sau với thanh đèn Nanoleaf hình học.
 */
export function Desk({
  position,
  yaw,
  active,
  onActivate,
}: {
  position: [number, number, number]
  yaw: number
  active: boolean
  onActivate: () => void
}) {
  const glow = useMemo(() => glowTexture(), [])
  const code = useMemo(() => makeScreen(1024, 640), [])
  const proj = useMemo(() => makeScreen(640, 640), [])
  const snk = useMemo(() => makeScreen(800, 500), [])
  const keys = useMemo(() => makeScreen(1024, 320), [])
  const mat = useMemo(() => makeScreen(1024, 340), [])

  const game = useRef<Game>(newGame())
  const hits = useRef<Hit[]>([])
  const hover = useRef<string | null>(null)
  const fan = useRef<THREE.Mesh[]>([])
  const aioRing = useRef<THREE.Mesh>(null)
  const strip = useRef<THREE.Mesh>(null)
  const ambientHalo = useRef<THREE.Mesh>(null)
  const frame = useRef(0)
  const root = useRef<THREE.Group>(null)

  // Khởi tạo Deskmat một lần
  useEffect(() => {
    const c = mat.canvas.getContext('2d')!
    drawDeskmat(c, mat.w, mat.h)
    mat.tex.needsUpdate = true
  }, [mat])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const map: Record<string, V> = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      }
      const d = map[k]
      if (d) {
        e.preventDefault()
        e.stopPropagation()
        const g = game.current
        if (g.state !== 'play') {
          const b = g.best
          game.current = newGame(b)
          game.current.state = 'play'
        }
        steer(game.current, d)
      }
      if (e.key === ' ' && game.current.state !== 'play') {
        e.preventDefault()
        const b = game.current.best
        game.current = newGame(b)
        game.current.state = 'play'
      }
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [active])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = game.current
    if (g.state === 'play') {
      g.acc += dt
      const stepT = Math.max(0.065, 0.13 - g.score * 0.003)
      while (g.acc > stepT && g.state === 'play') {
        g.acc -= stepT
        stepGame(g)
      }
    }

    if (root.current) root.current.visible = active
    if (!active) return

    frame.current++
    if (frame.current % 2 === 0) {
      let c = code.canvas.getContext('2d')!
      drawCode(c, code.w, code.h, t)
      code.tex.needsUpdate = true

      c = proj.canvas.getContext('2d')!
      hits.current = drawProjects(c, proj.w, proj.h, hover.current)
      proj.tex.needsUpdate = true

      c = snk.canvas.getContext('2d')!
      drawSnake(c, snk.w, snk.h, g, t)
      snk.tex.needsUpdate = true

      c = keys.canvas.getContext('2d')!
      drawKeys(c, keys.w, keys.h, t)
      keys.tex.needsUpdate = true
    }

    // Quạt tản nhiệt RGB quay
    fan.current.forEach((m, i) => {
      if (!m) return
      m.rotation.z = t * (2.8 + i * 0.5)
      ;(m.material as THREE.MeshBasicMaterial).color
        .setHSL((t * 0.15 + i * 0.12) % 1, 1, 0.55)
        .multiplyScalar(live.neon + 0.3)
    })

    // Vòng tản nhiệt nước AIO xoay
    if (aioRing.current) {
      aioRing.current.rotation.z = -t * 3
      ;(aioRing.current.material as THREE.MeshBasicMaterial).color
        .setHSL((t * 0.25) % 1, 1, 0.6)
        .multiplyScalar(live.neon + 0.4)
    }

    if (strip.current) {
      ;(strip.current.material as THREE.MeshBasicMaterial).color
        .setHSL((t * 0.2) % 1, 1, 0.55)
        .multiplyScalar(live.neon + 0.3)
    }

    if (ambientHalo.current) {
      ;(ambientHalo.current.material as THREE.MeshBasicMaterial).opacity =
        (0.28 + 0.08 * Math.sin(t * 2)) * live.neon
    }
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) =>
    uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null

  const screenProps = (kind: 'code' | 'proj' | 'snake') => ({
    onClick: (e: { stopPropagation: () => void; uv?: THREE.Vector2 }) => {
      e.stopPropagation()
      if (!active) {
        onActivate()
        return
      }
      if (kind === 'proj') {
        const p = uvToXY(e.uv, proj.w, proj.h)
        if (p)
          hits.current
            .find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h)
            ?.run()
      } else if (kind === 'snake') {
        const g = game.current
        if (g.state !== 'play') {
          const b = g.best
          game.current = newGame(b)
          game.current.state = 'play'
          return
        }
        // Chạm để rẽ
        const p = uvToXY(e.uv, snk.w, snk.h)
        if (!p) return
        const ox = (snk.w - COLS * CELL) / 2
        const oy = 52 + (snk.h - 52 - ROWS * CELL) / 2
        const dx = (p.x - ox) / CELL - (g.snake[0].x + 0.5)
        const dy = (p.y - oy) / CELL - (g.snake[0].y + 0.5)
        steer(
          g,
          Math.abs(dx) > Math.abs(dy)
            ? { x: Math.sign(dx) || 1, y: 0 }
            : { x: 0, y: Math.sign(dy) || 1 }
        )
      }
    },
    onPointerMove: (e: { stopPropagation: () => void; uv?: THREE.Vector2 }) => {
      e.stopPropagation()
      let h: string | null = null
      if (active && kind === 'proj') {
        const p = uvToXY(e.uv, proj.w, proj.h)
        if (p)
          h =
            hits.current.find(
              (x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h
            )?.id ?? null
      }
      hover.current = h
      document.body.style.cursor =
        !active || h || (active && kind === 'snake') ? 'pointer' : 'default'
    },
    onPointerOut: () => {
      hover.current = null
      document.body.style.cursor = ''
    },
  })

  const chassisMetal = '#10121a'
  const bezelMetal = '#08090e'

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* ─── TƯỜNG PHÒNG BATTLESTATION PHÍA SAU ─── */}
      <mesh position={[0, 0.45, -0.42]} raycast={() => null}>
        <planeGeometry args={[3.4, 1.8]} />
        <meshBasicMaterial color="#07080f" toneMapped={false} />
      </mesh>

      {/* Đèn Nanoleaf Neon hình học treo tường */}
      <group position={[0, 0.82, -0.41]} raycast={() => null}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
          <mesh key={i} position={[x, i % 2 === 0 ? 0.08 : -0.04, 0]} rotation-z={(i * Math.PI) / 3}>
            <ringGeometry args={[0.08, 0.095, 6]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? '#00f5d4' : '#ff007f'}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Vầng sáng Ambilight hắt tường sau màn hình */}
      <mesh ref={ambientHalo} position={[0, 0.28, -0.38]} raycast={() => null}>
        <planeGeometry args={[2.8, 1.4]} />
        <meshBasicMaterial
          map={glow}
          color="#7b3bff"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Sàn phòng + Vệt sáng phản chiếu màu tím neon */}
      <mesh position={[0, -0.399, 0.2]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[2.8, 1.8]} />
        <meshBasicMaterial
          map={glow}
          color="#ff007f"
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* ─── BÀN LÀM VIỆC CYBER GAMING ─── */}
      {/* Mặt bàn Carbon bo cong góc */}
      <RoundedBox
        args={[1.56, 0.036, 0.66]}
        radius={0.012}
        smoothness={2}
        position={[0, -0.018, 0.12]}
        raycast={() => null}
      >
        <meshBasicMaterial color="#131622" toneMapped={false} />
      </RoundedBox>

      {/* Dải LED RGB viền cạnh trước mặt bàn */}
      <mesh position={[0, -0.035, 0.448]} raycast={() => null}>
        <boxGeometry args={[1.56, 0.005, 0.005]} />
        <meshBasicMaterial color="#00f5d4" toneMapped={false} />
      </mesh>

      {/* Chân bàn kim loại chữ K thể thao */}
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, -0.215, 0.12]}>
          <mesh raycast={() => null}>
            <boxGeometry args={[0.04, 0.38, 0.52]} />
            <meshBasicMaterial color="#0a0c14" toneMapped={false} />
          </mesh>
          {/* Thanh chéo gia cố */}
          <mesh rotation-x={0.4} position={[0, 0, -0.08]} raycast={() => null}>
            <boxGeometry args={[0.03, 0.36, 0.03]} />
            <meshBasicMaterial color="#161a29" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* ─── THẢM CHUỘT CIRCUIT + BÀN PHÍM CƠ + CHUỘT GAMING ─── */}
      {/* Thảm chuột Deskmat cỡ lớn in vi mạch */}
      <mesh position={[0, 0.001, 0.25]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.05, 0.34]} />
        <meshBasicMaterial map={mat.tex} toneMapped={false} />
      </mesh>

      {/* Bàn phím cơ RGB cơ cấu nghiêng góc công thái học */}
      <group position={[-0.05, 0.012, 0.28]} rotation-x={-0.12}>
        <RoundedBox args={[0.48, 0.016, 0.16]} radius={0.006} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#0a0c14" toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0.009, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.46, 0.144]} />
          <meshBasicMaterial map={keys.tex} toneMapped={false} />
        </mesh>
      </group>

      {/* Chuột công thái học Gaming RGB */}
      <group position={[0.34, 0.014, 0.28]}>
        <RoundedBox args={[0.052, 0.02, 0.088]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color="#161926" toneMapped={false} />
        </RoundedBox>
        {/* Con lăn chuột phát sáng */}
        <mesh position={[0, 0.011, -0.022]} raycast={() => null}>
          <boxGeometry args={[0.008, 0.008, 0.018]} />
          <meshBasicMaterial color="#00f5d4" toneMapped={false} />
        </mesh>
        {/* Dải LED đáy chuột */}
        <mesh ref={strip} position={[0, -0.008, 0]} raycast={() => null}>
          <boxGeometry args={[0.054, 0.003, 0.09]} />
          <meshBasicMaterial color="#ff007f" toneMapped={false} />
        </mesh>
      </group>

      {/* Giá treo tai nghe Gaming bên trái */}
      <group position={[-0.64, 0.12, 0.32]}>
        <mesh position={[0, -0.1, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.04, 0.045, 0.012, 16]} />
          <meshBasicMaterial color="#0a0c14" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.02, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.008, 0.008, 0.22, 12]} />
          <meshBasicMaterial color="#161a29" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.13, 0]} rotation-z={Math.PI / 2} raycast={() => null}>
          <cylinderGeometry args={[0.012, 0.012, 0.07, 12]} />
          <meshBasicMaterial color="#0a0c14" toneMapped={false} />
        </mesh>
        {/* Vòng đệm tai nghe phát sáng */}
        {[-0.035, 0.035].map((x) => (
          <mesh key={x} position={[x, 0.09, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
            <torusGeometry args={[0.026, 0.008, 8, 24]} />
            <meshBasicMaterial color="#00f5d4" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* ─── MÀN HÌNH CHÍNH (GIỮA): VS CODE EDITOR ─── */}
      <group position={[0, 0.26, -0.02]}>
        {/* Thân và viền màn hình siêu mỏng */}
        <RoundedBox args={[0.76, 0.48, 0.026]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        {/* Mặt hiển thị Canvas Code */}
        <mesh position={[0, 0, 0.0135]} {...screenProps('code')}>
          <planeGeometry args={[0.73, 0.455]} />
          <meshBasicMaterial map={code.tex} toneMapped={false} />
        </mesh>
        {/* Ambilight hắt sáng sau màn hình giữa */}
        <mesh position={[0, 0, -0.02]} raycast={() => null}>
          <planeGeometry args={[0.82, 0.52]} />
          <meshBasicMaterial
            map={glow}
            color="#7aa2f7"
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {/* Chân đế kim loại màn hình giữa */}
        <mesh position={[0, -0.26, -0.02]} raycast={() => null}>
          <boxGeometry args={[0.06, 0.08, 0.03]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.295, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.26, 0.009, 0.16]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH TRÁI (DỰ ÁN): VERTICAL MONITOR ─── */}
      <group position={[-0.64, 0.24, 0.06]} rotation-y={0.46}>
        <RoundedBox args={[0.48, 0.48, 0.024]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0125]} {...screenProps('proj')}>
          <planeGeometry args={[0.45, 0.45]} />
          <meshBasicMaterial map={proj.tex} toneMapped={false} />
        </mesh>
        {/* Ambilight màn trái */}
        <mesh position={[0, 0, -0.02]} raycast={() => null}>
          <planeGeometry args={[0.54, 0.54]} />
          <meshBasicMaterial
            map={glow}
            color="#00f5d4"
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.26, -0.015]} raycast={() => null}>
          <boxGeometry args={[0.05, 0.07, 0.025]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.29, 0.015]} raycast={() => null}>
          <boxGeometry args={[0.18, 0.008, 0.12]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH PHẢI (ARCADE GAME): HORIZONTAL GAMING MONITOR ─── */}
      <group position={[0.64, 0.24, 0.06]} rotation-y={-0.46}>
        <RoundedBox args={[0.52, 0.35, 0.024]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0125]} {...screenProps('snake')}>
          <planeGeometry args={[0.49, 0.315]} />
          <meshBasicMaterial map={snk.tex} toneMapped={false} />
        </mesh>
        {/* Ambilight màn phải */}
        <mesh position={[0, 0, -0.02]} raycast={() => null}>
          <planeGeometry args={[0.58, 0.4]} />
          <meshBasicMaterial
            map={glow}
            color="#00ff88"
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.205, -0.015]} raycast={() => null}>
          <boxGeometry args={[0.05, 0.07, 0.025]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.235, 0.015]} raycast={() => null}>
          <boxGeometry args={[0.2, 0.008, 0.12]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
      </group>

      {/* ─── PC TOWER HIGH-END: BỂ CÁ LIQUID COOLING ─── */}
      <group position={[1.02, -0.18, 0.14]} rotation-y={-0.3}>
        {/* Khung vỏ case kim loại */}
        <RoundedBox args={[0.24, 0.44, 0.42]} radius={0.012} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#090b12" toneMapped={false} />
        </RoundedBox>

        {/* Mặt trước lưới thông gió Mesh */}
        <mesh position={[0, 0, 0.211]} raycast={() => null}>
          <planeGeometry args={[0.21, 0.41]} />
          <meshBasicMaterial color="#030408" toneMapped={false} />
        </mesh>

        {/* 3 Quạt tản nhiệt RGB mặt trước */}
        {[0.13, 0, -0.13].map((y, i) => (
          <group key={i} position={[0, y, 0.212]} raycast={() => null}>
            <mesh ref={(el) => { if (el) fan.current[i] = el }}>
              <torusGeometry args={[0.046, 0.007, 8, 32]} />
              <meshBasicMaterial color="#00f5d4" toneMapped={false} />
            </mesh>
            {/* Cánh quạt bên trong */}
            <mesh>
              <circleGeometry args={[0.038, 6]} />
              <meshBasicMaterial
                color="#ff007f"
                transparent
                opacity={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Mặt kính cường lực hông (Kính trong suốt) */}
        <mesh position={[0.121, 0, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.38, 0.4]} />
          <meshBasicMaterial color="#1a2035" transparent opacity={0.35} toneMapped={false} />
        </mesh>

        {/* Linh kiện bên trong case (GPU, Tản nhiệt nước CPU, RAM RGB) */}
        {/* Card đồ hoạ GPU cực ngầu */}
        <mesh position={[0.02, -0.06, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.08, 0.03, 0.26]} />
          <meshBasicMaterial color="#161b2b" toneMapped={false} />
        </mesh>
        <mesh position={[0.062, -0.06, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.003, 0.012, 0.24]} />
          <meshBasicMaterial color="#00f5d4" toneMapped={false} />
        </mesh>

        {/* Khối tản nhiệt nước CPU AIO có màn hình LCD nhiệt độ */}
        <group position={[0.02, 0.06, -0.02]}>
          <mesh ref={aioRing} raycast={() => null}>
            <torusGeometry args={[0.025, 0.005, 8, 24]} />
            <meshBasicMaterial color="#ff007f" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.002]} raycast={() => null}>
            <circleGeometry args={[0.019, 16]} />
            <meshBasicMaterial color="#00f5d4" toneMapped={false} />
          </mesh>
        </group>

        {/* 2 Thanh RAM RGB phát sáng rực rỡ */}
        {[-0.01, 0.01].map((offset) => (
          <mesh key={offset} position={[0.02 + offset, 0.07, 0.04]} raycast={() => null}>
            <boxGeometry args={[0.005, 0.045, 0.01]} />
            <meshBasicMaterial color="#ffd60a" toneMapped={false} />
          </mesh>
        ))}

        {/* Vầng sáng nội thất buồng máy */}
        <mesh position={[0.04, 0, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.34, 0.36]} />
          <meshBasicMaterial
            map={glow}
            color="#7b3bff"
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}
