'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'

const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'
const MONO = '"JetBrains Mono", monospace'

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

// ─────────────────────────────────────────────────────────────────────────────
// 1. VẼ HÌNH NỀN THIÊN NHIÊN: TRĂNG KHỔNG LỒ & RỪNG THÔNG (GIỐNG ẢNH 2)
// ─────────────────────────────────────────────────────────────────────────────
function drawMoonLandscape(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  screenType: 'main' | 'left' | 'laptop'
) {
  // Bầu trời đêm chuyển màu hoàng hôn nhẹ ở chân trời
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#0a1020')
  sky.addColorStop(0.42, '#121d38')
  sky.addColorStop(0.72, '#282642')
  sky.addColorStop(0.88, '#583a48')
  sky.addColorStop(1, '#825244')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Bụi sao lấp lánh trên nền trời
  ctx.fillStyle = '#ffffff'
  const offsetSeed = screenType === 'left' ? 100 : screenType === 'main' ? 200 : 300
  for (let i = 0; i < 50; i++) {
    const sx = (i * 127.3 + offsetSeed) % W
    const sy = (i * 73.1) % (H * 0.65)
    const sr = i % 4 === 0 ? 1.4 : 0.8
    ctx.globalAlpha = 0.25 + (i % 4) * 0.18
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Mặt trăng khổng lồ (vị trí canh chỉnh chuẩn theo ảnh 2)
  const mx = screenType === 'left' ? W * 0.85 : screenType === 'main' ? W * 0.52 : W * 0.52
  const my = screenType === 'laptop' ? H * 0.44 : H * 0.45
  const mr = Math.min(W, H) * (screenType === 'laptop' ? 0.38 : 0.42)

  // Vầng hào quang sáng của mặt trăng
  const glow = ctx.createRadialGradient(mx, my, mr * 0.75, mx, my, mr * 1.7)
  glow.addColorStop(0, 'rgba(255, 252, 235, 0.55)')
  glow.addColorStop(0.4, 'rgba(255, 238, 195, 0.22)')
  glow.addColorStop(0.8, 'rgba(255, 230, 180, 0.05)')
  glow.addColorStop(1, 'rgba(255, 230, 180, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(mx, my, mr * 1.7, 0, Math.PI * 2)
  ctx.fill()

  // Bề mặt Mặt trăng
  const moonGrad = ctx.createRadialGradient(mx - mr * 0.15, my - mr * 0.15, mr * 0.1, mx, my, mr)
  moonGrad.addColorStop(0, '#fffff7')
  moonGrad.addColorStop(0.65, '#fef7dc')
  moonGrad.addColorStop(0.92, '#eddcb5')
  moonGrad.addColorStop(1, '#c8b590')
  ctx.fillStyle = moonGrad
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()

  // Chi tiết bề mặt / hố trăng (craters & maria)
  ctx.save()
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.clip()

  ctx.fillStyle = 'rgba(75, 68, 58, 0.28)'
  const craters = [
    { x: -0.25, y: -0.28, r: 0.32 },
    { x: 0.22, y: -0.18, r: 0.29 },
    { x: -0.06, y: 0.12, r: 0.42 },
    { x: 0.32, y: 0.18, r: 0.26 },
    { x: -0.32, y: 0.12, r: 0.22 },
    { x: 0.08, y: -0.38, r: 0.2 },
  ]
  craters.forEach((c) => {
    ctx.beginPath()
    ctx.arc(mx + c.x * mr, my + c.y * mr, c.r * mr, 0, Math.PI * 2)
    ctx.fill()
  })

  // Dải mây hoàng hôn mềm mại vắt ngang phía dưới mặt trăng
  ctx.fillStyle = 'rgba(215, 138, 92, 0.5)'
  for (let j = 0; j < 5; j++) {
    const cy = my + mr * (0.22 + j * 0.17)
    ctx.beginPath()
    ctx.ellipse(mx + (j % 2 === 0 ? 35 : -40), cy, mr * 1.3, 20 + j * 5, (j - 2) * 0.04, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Dãy Rừng Thông bóng đổ (Pine Forest Silhouette)
  ctx.fillStyle = '#060911'
  ctx.fillRect(0, H - 36, W, 36)

  const step = Math.max(12, Math.floor(W / 42))
  for (let x = 0; x <= W + 20; x += step) {
    const seed = (x * 37) % 100
    const treeH = 40 + seed * 0.65
    const baseW = 14 + (seed % 10)
    const ty = H - 20

    ctx.beginPath()
    ctx.moveTo(x, ty - treeH)
    ctx.lineTo(x + baseW * 0.5, ty - treeH * 0.4)
    ctx.lineTo(x + baseW * 0.32, ty - treeH * 0.4)
    ctx.lineTo(x + baseW * 0.72, ty)
    ctx.lineTo(x - baseW * 0.72, ty)
    ctx.lineTo(x - baseW * 0.32, ty - treeH * 0.4)
    ctx.lineTo(x - baseW * 0.5, ty - treeH * 0.4)
    ctx.closePath()
    ctx.fill()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MÀN HÌNH CHÍNH (GIỮA): WINDOWS 11 DESKTOP THỰC THỤ
// ─────────────────────────────────────────────────────────────────────────────
function drawMainDesktop(ctx: CanvasRenderingContext2D, W: number, H: number, hover: string | null): Hit[] {
  const hits: Hit[] = []

  // Vẽ hình nền Mặt trăng & Rừng thông
  drawMoonLandscape(ctx, W, H, 'main')

  // Icon Desktop (Xếp 2 cột bên trái giống ảnh 2)
  const icons = [
    { id: 'pc', name: 'This PC', icon: '💻' },
    { id: 'bin', name: 'Recycle Bin', icon: '🗑️' },
    { id: 'proj', name: 'Dự Án', icon: '📁' },
    { id: 'code', name: 'VS Code', icon: '📝' },
    { id: 'web', name: 'Chrome', icon: '🌐' },
    { id: 'term', name: 'Terminal', icon: '⚡' },
    { id: 'steam', name: 'Steam', icon: '🎮' },
    { id: 'music', name: 'Spotify', icon: '🎵' },
    { id: 'cv', name: 'CV_Tri.pdf', icon: '📄' },
    { id: 'notes', name: 'Notes', icon: '📋' },
  ]

  icons.forEach((ic, i) => {
    const col = Math.floor(i / 5)
    const row = i % 5
    const ix = 20 + col * 68
    const iy = 24 + row * 72
    const isHv = hover === `ic_${ic.id}`

    if (isHv) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      rr(ctx, ix, iy, 58, 62, 8)
      ctx.fill()
    }

    ctx.font = '24px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(ic.icon, ix + 29, iy + 26)

    ctx.font = `600 10.5px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    ctx.fillText(ic.name, ix + 29, iy + 48)
    ctx.shadowBlur = 0

    hits.push({
      id: `ic_${ic.id}`,
      x: ix,
      y: iy,
      w: 58,
      h: 62,
      run: () => {
        if (ic.id === 'proj' || ic.id === 'code') {
          window.open(PROFILE.github, '_blank', 'noopener')
        } else if (ic.id === 'cv') {
          if (PROFILE.cv) window.open(PROFILE.cv, '_blank', 'noopener')
        }
      },
    })
  })

  // Thanh Taskbar Windows 11 ở cạnh dưới (Thanh kính mờ bo cong)
  const tbh = 38
  const tby = H - tbh
  ctx.fillStyle = 'rgba(18, 22, 35, 0.78)'
  ctx.fillRect(0, tby, W, tbh)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tby)
  ctx.lineTo(W, tby)
  ctx.stroke()

  // Cụm Icon Căn Giữa Windows 11
  const winIcons = ['🪟', '🔍', '📂', '🌐', '📝', '🎧', '🎮']
  const startX = W / 2 - (winIcons.length * 34) / 2
  winIcons.forEach((wIc, idx) => {
    const wx = startX + idx * 34
    const isWinHv = hover === `tb_${idx}`
    if (isWinHv) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      rr(ctx, wx, tby + 4, 30, 30, 6)
      ctx.fill()
    }
    ctx.font = '16px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(wIc, wx + 15, tby + 19)

    hits.push({
      id: `tb_${idx}`,
      x: wx,
      y: tby + 4,
      w: 30,
      h: 30,
      run: () => {
        if (idx === 3 || idx === 4) window.open(PROFILE.github, '_blank', 'noopener')
      },
    })
  })

  // System Tray góc phải (Wifi, Âm lượng, Pin, Ngày Giờ)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `600 11px ${FONT}`
  ctx.fillStyle = '#e2e8f0'
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
  ctx.fillText(`ENG  📶 🔊 ⚡  ${timeStr}`, W - 14, tby + 19)

  return hits
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MÀN HÌNH TRÁI: DUAL MONITOR NỐI DÀI HÌNH NỀN
// ─────────────────────────────────────────────────────────────────────────────
function drawLeftMonitor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  drawMoonLandscape(ctx, W, H, 'left')

  // Taskbar phụ
  const tbh = 38
  const tby = H - tbh
  ctx.fillStyle = 'rgba(18, 22, 35, 0.78)'
  ctx.fillRect(0, tby, W, tbh)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tby)
  ctx.lineTo(W, tby)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `600 11px ${FONT}`
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('  🪟  Display 2 // Extended Desktop', 12, tby + 19)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LAPTOP MACBOOK (GIỮA DƯỚI): NỐI DÀI HÌNH NỀN & BÀN PHÍM
// ─────────────────────────────────────────────────────────────────────────────
function drawLaptopScreen(ctx: CanvasRenderingContext2D, W: number, H: number) {
  drawMoonLandscape(ctx, W, H, 'laptop')

  // macOS Dock ở đáy laptop
  const dw = 180
  const dh = 24
  const dx = (W - dw) / 2
  const dy = H - dh - 6
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  rr(ctx, dx, dy, dw, dh, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  rr(ctx, dx, dy, dw, dh, 12)
  ctx.stroke()

  const macIcons = ['🧭', '💬', '✉️', '🎵', '⚙️']
  macIcons.forEach((ic, i) => {
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ic, dx + 18 + i * 36, dy + dh / 2)
  })
}

function drawLaptopKeyboard(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Mặt phím nhôm bạc MacBook
  ctx.fillStyle = '#d1d5db'
  ctx.fillRect(0, 0, W, H)

  // Vùng bàn phím đen
  ctx.fillStyle = '#111317'
  rr(ctx, 30, 20, W - 60, H * 0.55, 6)
  ctx.fill()

  // Phím bấm chiclet đen
  const rows = 5
  const cols = 14
  const kw = (W - 74) / cols
  const kh = (H * 0.55 - 14) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = '#1c1f24'
      rr(ctx, 35 + c * kw, 25 + r * kh, kw - 3, kh - 3, 2.5)
      ctx.fill()
    }
  }

  // Trackpad nhôm lớn chính giữa
  ctx.fillStyle = '#e5e7eb'
  rr(ctx, W / 2 - 70, H * 0.62, 140, H * 0.32, 6)
  ctx.fill()
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 1
  rr(ctx, W / 2 - 70, H * 0.62, 140, H * 0.32, 6)
  ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. IPAD / TABLET BÊN PHẢI: TRANH CAMO POP-ART TÍM VÀ VÀNG (GIỐNG ẢNH 2)
// ─────────────────────────────────────────────────────────────────────────────
function drawTabletGraphic(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Nền tím chấm bi / Halftone Pop-art
  ctx.fillStyle = '#4a2574'
  ctx.fillRect(0, 0, W, H)

  // Chấm bi pop-art
  ctx.fillStyle = '#3c1c60'
  for (let x = 6; x < W; x += 14) {
    for (let y = 6; y < H; y += 14) {
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Mảng màu vàng hữu cơ (Camouflage / Pop-art blobs giống ảnh 2)
  ctx.fillStyle = '#f5b027'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.4)
  ctx.bezierCurveTo(W * 0.2, H * 0.2, W * 0.4, H * 0.6, W * 0.65, H * 0.35)
  ctx.bezierCurveTo(W * 0.85, H * 0.15, W * 0.95, H * 0.5, W, H * 0.4)
  ctx.lineTo(W, H * 0.85)
  ctx.bezierCurveTo(W * 0.7, H * 0.95, W * 0.5, H * 0.7, W * 0.3, H * 0.85)
  ctx.bezierCurveTo(W * 0.1, H * 0.95, 0, H * 0.75, 0, H * 0.85)
  ctx.closePath()
  ctx.fill()

  // Mảng màu cam đất phụ
  ctx.fillStyle = '#d97706'
  ctx.beginPath()
  ctx.arc(W * 0.25, H * 0.3, 35, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(W * 0.82, H * 0.7, 45, 0, Math.PI * 2)
  ctx.fill()
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. THẢM CẮT / DESKMAT KẺ LƯỚI CARO XÁM (GIỐNG ẢNH 2)
// ─────────────────────────────────────────────────────────────────────────────
function drawGridDeskmat(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Nền thảm tối xám đen
  ctx.fillStyle = '#1e232a'
  ctx.fillRect(0, 0, W, H)

  // Viền bo quanh thảm
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 4
  rr(ctx, 4, 4, W - 8, H - 8, 10)
  ctx.stroke()

  // Lưới kẻ ô caro (Cutting mat grid giống ảnh 2)
  ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)'
  ctx.lineWidth = 1
  for (let x = 16; x < W - 16; x += 22) {
    ctx.beginPath()
    ctx.moveTo(x, 16)
    ctx.lineTo(x, H - 16)
    ctx.stroke()
  }
  for (let y = 16; y < H - 16; y += 22) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(W - 16, y)
    ctx.stroke()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN 3D COMPONENT: BÀN LÀM VIỆC ANIME MINIMALIST (TÁI HIỆN CHÍNH XÁC ẢNH 2)
// ─────────────────────────────────────────────────────────────────────────────
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

  // Canvas textures cho các màn hình và thiết bị
  const mainScreen = useMemo(() => makeScreen(1024, 640), [])
  const leftScreen = useMemo(() => makeScreen(960, 600), [])
  const laptopScreen = useMemo(() => makeScreen(640, 400), [])
  const laptopKeys = useMemo(() => makeScreen(640, 420), [])
  const tabletScreen = useMemo(() => makeScreen(512, 360), [])
  const deskmat = useMemo(() => makeScreen(1024, 420), [])

  const hitsRef = useRef<Hit[]>([])
  const hoverRef = useRef<string | null>(null)
  const root = useRef<THREE.Group>(null)

  // Khởi tạo các textures tĩnh một lần
  useEffect(() => {
    let c = leftScreen.canvas.getContext('2d')!
    drawLeftMonitor(c, leftScreen.w, leftScreen.h)
    leftScreen.tex.needsUpdate = true

    c = laptopScreen.canvas.getContext('2d')!
    drawLaptopScreen(c, laptopScreen.w, laptopScreen.h)
    laptopScreen.tex.needsUpdate = true

    c = laptopKeys.canvas.getContext('2d')!
    drawLaptopKeyboard(c, laptopKeys.w, laptopKeys.h)
    laptopKeys.tex.needsUpdate = true

    c = tabletScreen.canvas.getContext('2d')!
    drawTabletGraphic(c, tabletScreen.w, tabletScreen.h)
    tabletScreen.tex.needsUpdate = true

    c = deskmat.canvas.getContext('2d')!
    drawGridDeskmat(c, deskmat.w, deskmat.h)
    deskmat.tex.needsUpdate = true
  }, [leftScreen, laptopScreen, laptopKeys, tabletScreen, deskmat])

  useFrame(() => {
    if (root.current) root.current.visible = active
    if (!active) return

    // Cập nhật màn hình chính (Windows 11)
    const c = mainScreen.canvas.getContext('2d')!
    hitsRef.current = drawMainDesktop(c, mainScreen.w, mainScreen.h, hoverRef.current)
    mainScreen.tex.needsUpdate = true
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) =>
    uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null

  // Màu sắc vật liệu chuẩn thiết kế Studio / Anime Line-art trong ảnh 2
  const deskWood = '#9aa1ab'
  const wallGrey = '#cbcfd6'
  const bezelDark = '#181b22'
  const metallic = '#242831'

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* ─── TƯỜNG PHÒNG VÀ GẠCH ỐP STUDIO (SÁNG SỦA, GỌN GÀNG NHƯ ẢNH 2) ─── */}
      <mesh position={[0, 0.46, -0.44]} raycast={() => null}>
        <planeGeometry args={[3.8, 2.0]} />
        <meshBasicMaterial color={wallGrey} toneMapped={false} />
      </mesh>
      {/* Các đường chỉ nối tường (Panel lines) */}
      {[-1.0, 0, 1.0].map((x) => (
        <mesh key={x} position={[x, 0.46, -0.438]} raycast={() => null}>
          <boxGeometry args={[0.005, 2.0, 0.002]} />
          <meshBasicMaterial color="#a1a7b2" toneMapped={false} />
        </mesh>
      ))}

      {/* Sàn phòng màu xám nhạt */}
      <mesh position={[0, -0.399, 0.2]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[3.8, 2.0]} />
        <meshBasicMaterial color="#b2b7c0" toneMapped={false} />
      </mesh>

      {/* ─── BÀN LÀM VIỆC XÁM MINIMALIST (CÓ NGĂN KÉO PHẢI NHƯ ẢNH 2) ─── */}
      {/* Mặt bàn gỗ bo cạnh */}
      <RoundedBox args={[1.75, 0.038, 0.8]} radius={0.008} smoothness={2} position={[0, -0.019, 0.1]} raycast={() => null}>
        <meshBasicMaterial color={deskWood} toneMapped={false} />
      </RoundedBox>

      {/* Chân bàn hai bên */}
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, -0.21, 0.1]} raycast={() => null}>
          <boxGeometry args={[0.04, 0.38, 0.72]} />
          <meshBasicMaterial color="#888f9a" toneMapped={false} />
        </mesh>
      ))}
      {/* Ngăn kéo dưới mặt bàn bên phải (giống ảnh 2) */}
      <mesh position={[0.55, -0.07, 0.15]} raycast={() => null}>
        <boxGeometry args={[0.38, 0.08, 0.65]} />
        <meshBasicMaterial color="#808894" toneMapped={false} />
      </mesh>
      <mesh position={[0.55, -0.07, 0.476]} raycast={() => null}>
        <boxGeometry args={[0.1, 0.012, 0.015]} />
        <meshBasicMaterial color="#4b5563" toneMapped={false} />
      </mesh>

      {/* ─── THẢM CHUỘT / THẢM CẮT KẺ LƯỚI (CUTTING MAT TRÊN BÀN) ─── */}
      <mesh position={[-0.04, 0.001, 0.22]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.36, 0.52]} />
        <meshBasicMaterial map={deskmat.tex} toneMapped={false} />
      </mesh>

      {/* ─── MÀN HÌNH CHÍNH (GIỮA): TREO TRÊN TAY ARM, CÓ ĐÈN SCREENBAR ─── */}
      <group position={[0.04, 0.36, -0.03]}>
        {/* Khung màn hình */}
        <RoundedBox args={[0.74, 0.46, 0.024]} radius={0.008} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelDark} toneMapped={false} />
        </RoundedBox>
        {/* Mặt kính hiển thị Windows 11 */}
        <mesh
          position={[0, 0, 0.0125]}
          onClick={(e) => {
            e.stopPropagation()
            if (!active) {
              onActivate()
              return
            }
            const p = uvToXY(e.uv, mainScreen.w, mainScreen.h)
            if (p) {
              const hit = hitsRef.current.find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h)
              hit?.run()
            }
          }}
          onPointerMove={(e) => {
            e.stopPropagation()
            let h: string | null = null
            if (active) {
              const p = uvToXY(e.uv, mainScreen.w, mainScreen.h)
              if (p) {
                h = hitsRef.current.find((x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h)?.id ?? null
              }
            }
            hoverRef.current = h
            document.body.style.cursor = !active || h ? 'pointer' : 'default'
          }}
          onPointerOut={() => {
            hoverRef.current = null
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[0.71, 0.435]} />
          <meshBasicMaterial map={mainScreen.tex} toneMapped={false} />
        </mesh>

        {/* Chân trụ màn hình Arm gắn bàn */}
        <mesh position={[0, -0.28, -0.03]} raycast={() => null}>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 16]} />
          <meshBasicMaterial color={metallic} toneMapped={false} />
        </mesh>

        {/* Đèn Screenbar (Treo trên đỉnh màn hình chính giống ảnh 2) */}
        <mesh position={[0, 0.238, 0.025]} raycast={() => null}>
          <boxGeometry args={[0.48, 0.014, 0.018]} />
          <meshBasicMaterial color="#1f232b" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.23, 0.022]} raycast={() => null}>
          <boxGeometry args={[0.44, 0.003, 0.01]} />
          <meshBasicMaterial color="#fffbeb" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH TRÁI: CÓ WEBCAM TRÊN ĐỈNH (GIỐNG ẢNH 2) ─── */}
      <group position={[-0.66, 0.31, 0.08]} rotation-y={0.34}>
        <RoundedBox args={[0.66, 0.42, 0.022]} radius={0.008} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelDark} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0115]}>
          <planeGeometry args={[0.63, 0.395]} />
          <meshBasicMaterial map={leftScreen.tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.24, -0.02]} raycast={() => null}>
          <cylinderGeometry args={[0.018, 0.018, 0.18, 16]} />
          <meshBasicMaterial color={metallic} toneMapped={false} />
        </mesh>

        {/* Webcam kẹp trên đỉnh màn hình trái (giống ảnh 2) */}
        <group position={[0.18, 0.225, 0.01]} raycast={() => null}>
          <RoundedBox args={[0.07, 0.026, 0.028]} radius={0.006} smoothness={2}>
            <meshBasicMaterial color="#111318" toneMapped={false} />
          </RoundedBox>
          <mesh position={[0, 0, 0.015]}>
            <circleGeometry args={[0.009, 16]} />
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ─── LAPTOP MACBOOK MỞ MÀN HÌNH ĐẶT NGAY DƯỚI MÀN HÌNH CHÍNH (GIỐNG ẢNH 2) ─── */}
      <group position={[0.04, 0.008, 0.18]}>
        {/* Phần thân dưới nhôm + bàn phím */}
        <mesh position={[0, 0.004, 0.08]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.34, 0.22]} />
          <meshBasicMaterial map={laptopKeys.tex} toneMapped={false} />
        </mesh>
        <RoundedBox args={[0.344, 0.008, 0.224]} radius={0.004} smoothness={2} position={[0, 0.003, 0.08]} raycast={() => null}>
          <meshBasicMaterial color="#d1d5db" toneMapped={false} />
        </RoundedBox>

        {/* Màn hình laptop mở góc ~105 độ */}
        <group position={[0, 0.008, -0.03]} rotation-x={0.24}>
          <RoundedBox args={[0.34, 0.22, 0.006]} radius={0.004} smoothness={2} position={[0, 0.11, 0]} raycast={() => null}>
            <meshBasicMaterial color="#1f232b" toneMapped={false} />
          </RoundedBox>
          <mesh position={[0, 0.11, 0.0035]}>
            <planeGeometry args={[0.325, 0.205]} />
            <meshBasicMaterial map={laptopScreen.tex} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ─── GỐI TỰA CỔ HÌNH CHỮ U (GIỐNG ẢNH 2) ─── */}
      <group position={[-0.28, 0.08, 0.15]} rotation-y={0.25} rotation-z={-0.12} raycast={() => null}>
        <mesh>
          <torusGeometry args={[0.075, 0.032, 16, 28, Math.PI * 1.4]} />
          <meshBasicMaterial color="#c2c7ce" toneMapped={false} />
        </mesh>
        {/* Đôi tai mèo trang trí trên gối giống ảnh 2 */}
        {[-0.04, 0.04].map((tx) => (
          <mesh key={tx} position={[tx, 0.08, 0]} rotation-z={tx < 0 ? 0.3 : -0.3}>
            <coneGeometry args={[0.016, 0.03, 4]} />
            <meshBasicMaterial color="#a9b0b8" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* ─── BÀN PHÍM CƠ NẰM NGHIÊNG BÊN TRÁI (GIỐNG ẢNH 2) ─── */}
      <group position={[-0.42, 0.02, 0.32]} rotation-y={0.16} rotation-x={-0.08} raycast={() => null}>
        <RoundedBox args={[0.34, 0.024, 0.13]} radius={0.006} smoothness={2}>
          <meshBasicMaterial color="#1e2329" toneMapped={false} />
        </RoundedBox>
        {/* Cụm keycaps đen xám */}
        <mesh position={[0, 0.013, 0]}>
          <boxGeometry args={[0.32, 0.008, 0.115]} />
          <meshBasicMaterial color="#2d333b" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── LOA CUBE TRONG SUỐT CẠNH LAPTOP (GIỐNG ẢNH 2) ─── */}
      <group position={[0.27, 0.05, 0.14]} rotation-y={-0.15} raycast={() => null}>
        <RoundedBox args={[0.09, 0.09, 0.09]} radius={0.01} smoothness={2}>
          <meshBasicMaterial color="#e5e7eb" transparent opacity={0.4} toneMapped={false} />
        </RoundedBox>
        {/* Nón loa màu vàng đồng bên trong */}
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.032, 0.016, 0.06, 16]} />
          <meshBasicMaterial color="#d97706" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── CHUỘT TRẮNG CÔNG THÁI HỌC (GIỐNG ẢNH 2) ─── */}
      <group position={[0.32, 0.012, 0.28]} rotation-y={-0.12} raycast={() => null}>
        <RoundedBox args={[0.052, 0.022, 0.085]} radius={0.012} smoothness={3}>
          <meshBasicMaterial color="#f8fafc" toneMapped={false} />
        </RoundedBox>
      </group>

      {/* ─── IPAD / TABLET BẬT TRANH CAMO POP-ART (GIỐNG ẢNH 2) ─── */}
      <group position={[0.52, 0.08, 0.24]} rotation-y={-0.42} rotation-x={-0.34}>
        <RoundedBox args={[0.32, 0.22, 0.01]} radius={0.008} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#1f242d" toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0055]} raycast={() => null}>
          <planeGeometry args={[0.305, 0.205]} />
          <meshBasicMaterial map={tabletScreen.tex} toneMapped={false} />
        </mesh>
        {/* Chân chống tablet */}
        <mesh position={[0, -0.06, -0.05]} rotation-x={0.6} raycast={() => null}>
          <boxGeometry args={[0.15, 0.12, 0.006]} />
          <meshBasicMaterial color="#374151" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── CASE MÁY TÍNH + CHỒNG SÁCH + ĐÈN BÓNG BẦU ĐIỆN VÀNG (GIỐNG ẢNH 2) ─── */}
      <group position={[0.58, 0.18, -0.16]} rotation-y={-0.2}>
        {/* Vỏ case PC đen sang trọng */}
        <RoundedBox args={[0.26, 0.38, 0.42]} radius={0.01} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#181b22" toneMapped={false} />
        </RoundedBox>
        {/* Kính hông case trong suốt */}
        <mesh position={[-0.131, 0, 0]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.38, 0.34]} />
          <meshBasicMaterial color="#2d3340" transparent opacity={0.3} toneMapped={false} />
        </mesh>

        {/* Chồng sách đặt trên nóc case (Cuốn xanh lá & cuốn xanh dương như ảnh 2) */}
        <group position={[0.02, 0.21, -0.02]} raycast={() => null}>
          {/* Cuốn sách xanh dương dưới */}
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.24]} />
            <meshBasicMaterial color="#1e3a5f" toneMapped={false} />
          </mesh>
          {/* Cuốn sách xanh ngọc trên */}
          <mesh position={[-0.01, 0.03, 0.01]}>
            <boxGeometry args={[0.17, 0.018, 0.23]} />
            <meshBasicMaterial color="#2dd4bf" toneMapped={false} />
          </mesh>
        </group>

        {/* ĐÈN BÓNG TRÒN VINTAGE EDISON (PHÁT SÁNG VÀNG ẤM ÁP TRÊN NÓC CASE) */}
        <group position={[0.01, 0.31, -0.02]}>
          {/* Đế đèn gỗ tròn */}
          <mesh position={[0, -0.035, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.045, 0.048, 0.02, 18]} />
            <meshBasicMaterial color="#78350f" toneMapped={false} />
          </mesh>
          {/* Đui đèn kim loại */}
          <mesh position={[0, -0.015, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.022, 0.022, 0.024, 16]} />
            <meshBasicMaterial color="#475569" toneMapped={false} />
          </mesh>
          {/* Bóng đèn thuỷ tinh hình bầu tròn */}
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.048, 20, 20]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          {/* Tim đèn dây tóc Edison phát sáng */}
          <mesh position={[0, 0, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.006, 0.006, 0.038, 8]} />
            <meshBasicMaterial color="#f59e0b" toneMapped={false} />
          </mesh>
          {/* Vầng sáng vàng ấm tỏa ra từ bóng đèn */}
          <mesh position={[0, 0, 0]} raycast={() => null}>
            <planeGeometry args={[0.65, 0.65]} />
            <meshBasicMaterial
              map={glow}
              color="#fef08a"
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
