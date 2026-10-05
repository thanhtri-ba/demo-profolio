'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { glowTexture } from '@/lib/textures'

const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'

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

function makeCanvasScreen(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { canvas, tex, w, h }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THẢM CẮT KỸ THUẬT (CUTTING MAT / GRID DESKMAT) CHÂN THỰC NHƯ ẢNH 2
// ─────────────────────────────────────────────────────────────────────────────
function drawCuttingMat(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Nền xám than đậm chất cao su tự lành đặc trưng
  ctx.fillStyle = '#21252d'
  ctx.fillRect(0, 0, W, H)

  // Viền bo góc ngoài
  ctx.strokeStyle = '#475164'
  ctx.lineWidth = 3
  rr(ctx, 6, 6, W - 12, H - 12, 12)
  ctx.stroke()

  // Viền phụ thước đo
  ctx.strokeStyle = '#384050'
  ctx.lineWidth = 1.5
  rr(ctx, 18, 18, W - 36, H - 36, 6)
  ctx.stroke()

  // Vạch chia thước xung quanh cạnh
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)'
  ctx.fillStyle = 'rgba(203, 213, 225, 0.65)'
  ctx.font = '600 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  for (let x = 30; x <= W - 30; x += 10) {
    const isMajor = (x - 30) % 50 === 0
    ctx.lineWidth = isMajor ? 1.5 : 0.8
    ctx.beginPath()
    ctx.moveTo(x, 18)
    ctx.lineTo(x, isMajor ? 28 : 23)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x, H - 18)
    ctx.lineTo(x, isMajor ? H - 28 : H - 23)
    ctx.stroke()

    if (isMajor && x < W - 50) {
      ctx.fillText(String((x - 30) / 10), x, 7)
    }
  }

  // Lưới ô vuông nhỏ (Fine Grid 20px)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)'
  ctx.lineWidth = 0.8
  for (let x = 30; x <= W - 30; x += 20) {
    ctx.beginPath()
    ctx.moveTo(x, 28)
    ctx.lineTo(x, H - 28)
    ctx.stroke()
  }
  for (let y = 30; y <= H - 30; y += 20) {
    ctx.beginPath()
    ctx.moveTo(30, y)
    ctx.lineTo(W - 30, y)
    ctx.stroke()
  }

  // Lưới ô vuông lớn chính (Major Grid 100px)
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)'
  ctx.lineWidth = 1.4
  for (let x = 30; x <= W - 30; x += 100) {
    ctx.beginPath()
    ctx.moveTo(x, 28)
    ctx.lineTo(x, H - 28)
    ctx.stroke()
  }
  for (let y = 30; y <= H - 30; y += 100) {
    ctx.beginPath()
    ctx.moveTo(30, y)
    ctx.lineTo(W - 30, y)
    ctx.stroke()
  }

  // Đường phân độ góc 30°, 45°, 60°
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.32)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(30, H - 28)
  ctx.lineTo(Math.min(W - 30, 30 + (H - 56)), 28)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(30, H - 28)
  ctx.lineTo(Math.min(W - 30, 30 + (H - 56) * 0.577), 28)
  ctx.stroke()

  // Chữ in chìm kỹ thuật góc thảm
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.font = '700 11px system-ui'
  ctx.fillStyle = 'rgba(203, 213, 225, 0.35)'
  ctx.fillText('SELF-HEALING CUTTING MAT  //  A1  850×500mm', W - 35, H - 8)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BÀN PHÍM CƠ CHÂN THỰC (MECHANICAL KEYBOARD CHERRY PROFILE)
// ─────────────────────────────────────────────────────────────────────────────
function drawKeycap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, side: string) {
  ctx.fillStyle = side
  rr(ctx, x, y, w, h, 3)
  ctx.fill()

  ctx.fillStyle = top
  rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 2.5)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(x + 2, y + 2)
  ctx.lineTo(x + w - 2, y + 2)
  ctx.stroke()
}

function drawMechKeyboard(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#16191f'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#2d3340'
  ctx.lineWidth = 2
  rr(ctx, 4, 4, W - 8, H - 8, 6)
  ctx.stroke()

  ctx.fillStyle = '#0f1115'
  rr(ctx, 10, 10, W - 20, H - 20, 4)
  ctx.fill()

  const rows = [
    { count: 16, h: 22, esc: true },
    { count: 15, h: 24 },
    { count: 15, h: 24 },
    { count: 14, h: 24 },
    { count: 14, h: 24 },
    { count: 8, h: 26, space: true },
  ]

  let curY = 14
  rows.forEach((row, rIdx) => {
    const keyH = row.h
    const gap = 3
    if (row.space) {
      const leftKeys = [32, 28, 32]
      let kx = 14
      leftKeys.forEach((kw) => {
        drawKeycap(ctx, kx, curY, kw, keyH, '#2a2f3a', '#1e222b')
        kx += kw + gap
      })
      const spaceW = W - 28 - kx - 130
      drawKeycap(ctx, kx, curY, spaceW, keyH, '#363d4a', '#262a34')
      kx += spaceW + gap
      const rightKeys = [28, 28, 28, 38]
      rightKeys.forEach((kw) => {
        drawKeycap(ctx, kx, curY, kw, keyH, '#2a2f3a', '#1e222b')
        kx += kw + gap
      })
    } else {
      const keyW = (W - 28 - (row.count - 1) * gap) / row.count
      for (let c = 0; c < row.count; c++) {
        const kx = 14 + c * (keyW + gap)
        let topColor = '#2f3542'
        let sideColor = '#1f232c'
        if (row.esc && c === 0) {
          topColor = '#ea580c'
          sideColor = '#9a3412'
        } else if (c === row.count - 1 || (rIdx > 0 && c === 0)) {
          topColor = '#242832'
          sideColor = '#181b22'
        }
        drawKeycap(ctx, kx, curY, keyW, keyH, topColor, sideColor)
      }
    }
    curY += keyH + gap
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MÀN HÌNH CHÍNH: HÌNH NỀN TRĂNG THỰC + WINDOWS 11 CHÂN THỰC
// ─────────────────────────────────────────────────────────────────────────────
function renderMainMonitor(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wallImg: HTMLImageElement | null,
  hover: string | null
): Hit[] {
  const hits: Hit[] = []

  if (wallImg && wallImg.complete) {
    ctx.drawImage(wallImg, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  // Các Icon Desktop Windows 11
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
    const ix = 22 + col * 68
    const iy = 26 + row * 72
    const isHv = hover === `ic_${ic.id}`

    if (isHv) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
      rr(ctx, ix, iy, 58, 62, 8)
      ctx.fill()
    }

    ctx.font = '24px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(ic.icon, ix + 29, iy + 26)

    ctx.font = `600 10.5px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 5
    ctx.fillText(ic.name, ix + 29, iy + 48)
    ctx.shadowBlur = 0

    hits.push({
      id: `ic_${ic.id}`,
      x: ix,
      y: iy,
      w: 58,
      h: 62,
      run: () => {
        if (ic.id === 'proj' || ic.id === 'code') window.open(PROFILE.github, '_blank', 'noopener')
        else if (ic.id === 'cv' && PROFILE.cv) window.open(PROFILE.cv, '_blank', 'noopener')
      },
    })
  })

  // Thanh Taskbar Windows 11 ở cạnh dưới (Thanh kính mờ)
  const tbh = 40
  const tby = H - tbh
  ctx.fillStyle = 'rgba(15, 20, 32, 0.76)'
  ctx.fillRect(0, tby, W, tbh)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tby)
  ctx.lineTo(W, tby)
  ctx.stroke()

  // Cụm Icon Căn Giữa Windows 11
  const winIcons = ['🪟', '🔍', '📂', '🌐', '📝', '🎧', '🎮']
  const startX = W / 2 - (winIcons.length * 36) / 2
  winIcons.forEach((wIc, idx) => {
    const wx = startX + idx * 36
    const isWinHv = hover === `tb_${idx}`
    if (isWinHv) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      rr(ctx, wx, tby + 4, 32, 32, 6)
      ctx.fill()
    }
    ctx.font = '17px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(wIc, wx + 16, tby + 20)

    hits.push({
      id: `tb_${idx}`,
      x: wx,
      y: tby + 4,
      w: 32,
      h: 32,
      run: () => {
        if (idx === 3 || idx === 4) window.open(PROFILE.github, '_blank', 'noopener')
      },
    })
  })

  // System Tray góc phải
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `600 11.5px ${FONT}`
  ctx.fillStyle = '#e2e8f0'
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
  ctx.fillText(`ENG   📶 🔊 ⚡   ${timeStr}`, W - 16, tby + 20)

  return hits
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MÀN HÌNH TRÁI: HIỂN THỊ PHẦN NỐI DÀI CỦA HÌNH NỀN
// ─────────────────────────────────────────────────────────────────────────────
function renderLeftMonitor(ctx: CanvasRenderingContext2D, W: number, H: number, wallImg: HTMLImageElement | null) {
  if (wallImg && wallImg.complete) {
    ctx.drawImage(wallImg, 0, 0, wallImg.width * 0.7, wallImg.height, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  const tbh = 40
  const tby = H - tbh
  ctx.fillStyle = 'rgba(15, 20, 32, 0.76)'
  ctx.fillRect(0, tby, W, tbh)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tby)
  ctx.lineTo(W, tby)
  ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LAPTOP MACBOOK (GIỮA DƯỚI): NỐI DÀI HÌNH NỀN & BÀN PHÍM
// ─────────────────────────────────────────────────────────────────────────────
function renderLaptopScreen(ctx: CanvasRenderingContext2D, W: number, H: number, wallImg: HTMLImageElement | null) {
  if (wallImg && wallImg.complete) {
    ctx.drawImage(wallImg, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  // macOS Dock ở đáy laptop
  const dw = 190
  const dh = 24
  const dx = (W - dw) / 2
  const dy = H - dh - 6
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  rr(ctx, dx, dy, dw, dh, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1
  rr(ctx, dx, dy, dw, dh, 12)
  ctx.stroke()

  const macIcons = ['🧭', '💬', '✉️', '🎵', '⚙️']
  macIcons.forEach((ic, i) => {
    ctx.font = '13px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ic, dx + 19 + i * 38, dy + dh / 2)
  })
}

function drawLaptopKeyboard(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#d1d5db'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#111317'
  rr(ctx, 30, 20, W - 60, H * 0.55, 6)
  ctx.fill()

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
// 6. MAIN 3D COMPONENT: BÀN MÁY TÍNH THẬT NHƯ ẢNH 2
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

  // Canvas textures cho màn hình, bàn phím cơ, laptop & thảm
  const mainScreen = useMemo(() => makeCanvasScreen(1024, 640), [])
  const leftScreen = useMemo(() => makeCanvasScreen(960, 600), [])
  const laptopScreen = useMemo(() => makeCanvasScreen(640, 400), [])
  const laptopKeys = useMemo(() => makeCanvasScreen(640, 420), [])
  const mechKeyboard = useMemo(() => makeCanvasScreen(512, 220), [])
  const deskmat = useMemo(() => makeCanvasScreen(1024, 420), [])

  // Texture của Tablet Pop-Art
  const tabletTexture = useMemo(() => {
    const t = new THREE.TextureLoader().load('/textures/tablet-camo.jpg')
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

  const wallImgRef = useRef<HTMLImageElement | null>(null)
  const hitsRef = useRef<Hit[]>([])
  const hoverRef = useRef<string | null>(null)
  const root = useRef<THREE.Group>(null)

  // Tải hình ảnh Mặt Trăng & Rừng thông chân thực
  useEffect(() => {
    const img = new Image()
    img.src = '/textures/moon-forest.jpg'
    img.onload = () => {
      wallImgRef.current = img

      const lc = leftScreen.canvas.getContext('2d')!
      renderLeftMonitor(lc, leftScreen.w, leftScreen.h, img)
      leftScreen.tex.needsUpdate = true

      const lapC = laptopScreen.canvas.getContext('2d')!
      renderLaptopScreen(lapC, laptopScreen.w, laptopScreen.h, img)
      laptopScreen.tex.needsUpdate = true
    }

    const kc = laptopKeys.canvas.getContext('2d')!
    drawLaptopKeyboard(kc, laptopKeys.w, laptopKeys.h)
    laptopKeys.tex.needsUpdate = true

    const kbC = mechKeyboard.canvas.getContext('2d')!
    drawMechKeyboard(kbC, mechKeyboard.w, mechKeyboard.h)
    mechKeyboard.tex.needsUpdate = true

    const mc = deskmat.canvas.getContext('2d')!
    drawCuttingMat(mc, deskmat.w, deskmat.h)
    deskmat.tex.needsUpdate = true
  }, [leftScreen, laptopScreen, laptopKeys, mechKeyboard, deskmat])

  useFrame(() => {
    if (root.current) root.current.visible = active
    if (!active) return

    const c = mainScreen.canvas.getContext('2d')!
    hitsRef.current = renderMainMonitor(c, mainScreen.w, mainScreen.h, wallImgRef.current, hoverRef.current)
    mainScreen.tex.needsUpdate = true
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) =>
    uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null

  return (
    <group ref={root} position={position} rotation-y={yaw}>
      {/* ─── NGUỒN SÁNG PHÒNG STUDIO CHÂN THỰC ─── */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[-1.2, 2.5, 2.2]} intensity={1.1} />

      {/* ─── TƯỜNG PHÒNG STUDIO XÁM NHẠT VỚI KHE VIỀN KIẾN TRÚC (NHƯ ẢNH 2) ─── */}
      <mesh position={[0, 0.6, -0.32]} raycast={() => null}>
        <planeGeometry args={[4.2, 2.2]} />
        <meshStandardMaterial color="#cbd2dc" roughness={0.9} />
      </mesh>
      {[-1.3, -0.5, 0.5, 1.3].map((wx) => (
        <mesh key={wx} position={[wx, 0.6, -0.318]} raycast={() => null}>
          <boxGeometry args={[0.006, 2.2, 0.004]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}
      <mesh position={[0, 1.25, -0.318]} raycast={() => null}>
        <boxGeometry args={[4.2, 0.008, 0.004]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Sàn phòng màu xám */}
      <mesh position={[0, -0.399, 0.2]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[3.8, 2.0]} />
        <meshStandardMaterial color="#b2b7c0" roughness={0.8} />
      </mesh>

      {/* ─── BÀN LÀM VIỆC XÁM MINIMALIST CÓ NGĂN KÉO PHẢI (NHƯ ẢNH 2) ─── */}
      <RoundedBox args={[1.78, 0.04, 0.82]} radius={0.008} smoothness={2} position={[0, -0.02, 0.1]} raycast={() => null}>
        <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.1} />
      </RoundedBox>

      {/* Chân bàn kim loại vững chắc */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, -0.21, 0.1]} raycast={() => null}>
          <boxGeometry args={[0.04, 0.38, 0.74]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} />
        </mesh>
      ))}
      {/* Ngăn kéo tiện ích bên phải dưới mặt bàn */}
      <mesh position={[0.56, -0.07, 0.16]} raycast={() => null}>
        <boxGeometry args={[0.38, 0.08, 0.68]} />
        <meshStandardMaterial color="#828a96" roughness={0.5} />
      </mesh>
      {/* Tay nắm ngăn kéo nhôm vát */}
      <mesh position={[0.56, -0.07, 0.502]} raycast={() => null}>
        <boxGeometry args={[0.1, 0.012, 0.012]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ─── THẢM CẮT KẺ LƯỚI CARO (CUTTING MAT TRÊN BÀN) ─── */}
      <mesh position={[-0.04, 0.001, 0.22]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.36, 0.52]} />
        <meshBasicMaterial map={deskmat.tex} toneMapped={false} />
      </mesh>

      {/* ─── MÀN HÌNH CHÍNH (GIỮA): TREO TRÊN TAY ARM, CÓ ĐÈN SCREENBAR ─── */}
      <group position={[0.04, 0.36, -0.03]}>
        <RoundedBox args={[0.74, 0.46, 0.024]} radius={0.008} smoothness={3} raycast={() => null}>
          <meshStandardMaterial color="#111318" roughness={0.3} metalness={0.4} />
        </RoundedBox>
        {/* Mặt hiển thị Windows 11 */}
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
          <meshStandardMaterial color="#2d3340" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Đèn Screenbar (Treo trên đỉnh màn hình chính) */}
        <mesh position={[0, 0.238, 0.025]} raycast={() => null}>
          <boxGeometry args={[0.48, 0.014, 0.018]} />
          <meshStandardMaterial color="#1f232b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.23, 0.022]} raycast={() => null}>
          <boxGeometry args={[0.44, 0.003, 0.01]} />
          <meshBasicMaterial color="#fffbeb" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH TRÁI: CÓ WEBCAM TRÊN ĐỈNH ─── */}
      <group position={[-0.66, 0.31, 0.08]} rotation-y={0.34}>
        <RoundedBox args={[0.66, 0.42, 0.022]} radius={0.008} smoothness={3} raycast={() => null}>
          <meshStandardMaterial color="#111318" roughness={0.3} metalness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0115]}>
          <planeGeometry args={[0.63, 0.395]} />
          <meshBasicMaterial map={leftScreen.tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.24, -0.02]} raycast={() => null}>
          <cylinderGeometry args={[0.018, 0.018, 0.18, 16]} />
          <meshStandardMaterial color="#2d3340" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Webcam kẹp trên đỉnh màn hình trái */}
        <group position={[0.18, 0.225, 0.01]} raycast={() => null}>
          <RoundedBox args={[0.07, 0.026, 0.028]} radius={0.006} smoothness={2}>
            <meshStandardMaterial color="#111318" roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0, 0.015]}>
            <circleGeometry args={[0.009, 16]} />
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ─── LAPTOP MACBOOK MỞ MÀN HÌNH ĐẶT NGAY DƯỚI MÀN HÌNH CHÍNH ─── */}
      <group position={[0.04, 0.008, 0.18]}>
        {/* Phần thân dưới nhôm + bàn phím */}
        <mesh position={[0, 0.004, 0.08]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.34, 0.22]} />
          <meshBasicMaterial map={laptopKeys.tex} toneMapped={false} />
        </mesh>
        <RoundedBox args={[0.344, 0.008, 0.224]} radius={0.004} smoothness={2} position={[0, 0.003, 0.08]} raycast={() => null}>
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.25} />
        </RoundedBox>

        {/* Màn hình laptop mở góc ~105 độ */}
        <group position={[0, 0.008, -0.03]} rotation-x={0.24}>
          <RoundedBox args={[0.34, 0.22, 0.006]} radius={0.004} smoothness={2} position={[0, 0.11, 0]} raycast={() => null}>
            <meshStandardMaterial color="#1f232b" roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.11, 0.0035]}>
            <planeGeometry args={[0.325, 0.205]} />
            <meshBasicMaterial map={laptopScreen.tex} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ─── GỐI TỰA CỔ CHỮ U CÓ ĐÔI TAI MÈO & DÂY RÚT (CHUẨN ẢNH 2) ─── */}
      <group position={[-0.28, 0.09, 0.14]} rotation-y={0.25} rotation-z={-0.12} raycast={() => null}>
        <mesh>
          <torusGeometry args={[0.076, 0.034, 20, 32, Math.PI * 1.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {/* Đôi tai mèo trên gối */}
        {[-0.04, 0.04].map((tx) => (
          <mesh key={tx} position={[tx, 0.085, 0]} rotation-z={tx < 0 ? 0.3 : -0.3}>
            <coneGeometry args={[0.016, 0.032, 4]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
        ))}
        {/* Dây rút gối có chốt bấm */}
        <mesh position={[0, -0.05, 0.02]}>
          <cylinderGeometry args={[0.003, 0.003, 0.06, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        <mesh position={[0, -0.06, 0.02]}>
          <boxGeometry args={[0.014, 0.012, 0.012]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* ─── BÀN PHÍM CƠ NẰM NGHIÊNG BÊN TRÁI (CHUẨN ẢNH 2) ─── */}
      <group position={[-0.42, 0.016, 0.32]} rotation-y={0.2} rotation-x={-0.08} raycast={() => null}>
        <RoundedBox args={[0.34, 0.018, 0.14]} radius={0.006} smoothness={2}>
          <meshStandardMaterial color="#1a1e24" roughness={0.4} metalness={0.6} />
        </RoundedBox>
        <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.33, 0.13]} />
          <meshBasicMaterial map={mechKeyboard.tex} toneMapped={false} />
        </mesh>
      </group>

      {/* ─── LOA CUBE TRONG SUỐT CẠNH LAPTOP (CHUẨN ẢNH 2) ─── */}
      <group position={[0.27, 0.05, 0.14]} rotation-y={-0.15} raycast={() => null}>
        <RoundedBox args={[0.09, 0.09, 0.09]} radius={0.012} smoothness={3}>
          <meshStandardMaterial color="#f1f5f9" transparent opacity={0.35} roughness={0.1} metalness={0.2} />
        </RoundedBox>
        {/* Vành loa đồng thau */}
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.034, 0.02, 0.06, 20]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Nón loa chính giữa */}
        <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.02]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ─── CHUỘT TRẮNG CÔNG THÁI HỌC (CHUẨN ẢNH 2) ─── */}
      <group position={[0.32, 0.012, 0.28]} rotation-y={-0.12} raycast={() => null}>
        <RoundedBox args={[0.052, 0.022, 0.085]} radius={0.012} smoothness={3}>
          <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.1} />
        </RoundedBox>
        {/* Con lăn chuột */}
        <mesh position={[0, 0.012, -0.016]}>
          <boxGeometry args={[0.008, 0.006, 0.02]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* ─── IPAD / TABLET BẬT TRANH POP-ART VÀNG & TÍM (CHUẨN ẢNH 2) ─── */}
      <group position={[0.52, 0.08, 0.24]} rotation-y={-0.42} rotation-x={-0.34}>
        <RoundedBox args={[0.32, 0.22, 0.01]} radius={0.008} smoothness={2} raycast={() => null}>
          <meshStandardMaterial color="#1f242d" roughness={0.4} metalness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0055]} raycast={() => null}>
          <planeGeometry args={[0.305, 0.205]} />
          <meshBasicMaterial map={tabletTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.06, -0.05]} rotation-x={0.6} raycast={() => null}>
          <boxGeometry args={[0.15, 0.12, 0.006]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* ─── CASE MÁY TÍNH + CHỒNG SÁCH + ĐÈN BÓNG BẦU ĐIỆN VÀNG (CHUẨN ẢNH 2) ─── */}
      <group position={[0.58, 0.18, -0.16]} rotation-y={-0.2}>
        {/* Vỏ case PC đen */}
        <RoundedBox args={[0.26, 0.38, 0.42]} radius={0.01} smoothness={2} raycast={() => null}>
          <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.5} />
        </RoundedBox>

        {/* Kính hông case trong suốt */}
        <mesh position={[-0.131, 0, 0]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.38, 0.34]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.35} roughness={0.1} metalness={0.2} />
        </mesh>

        {/* Linh kiện bên trong case qua lớp kính */}
        {/* Mainboard */}
        <mesh position={[-0.04, 0, 0]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.34, 0.3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* CPU Cooler tản nhiệt có quạt LED tròn */}
        <group position={[-0.02, 0.06, -0.04]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.035, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.018, 0]}>
            <torusGeometry args={[0.038, 0.004, 12, 24]} />
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
        {/* Thanh RAM RGB */}
        {[-0.01, 0.01].map((rx) => (
          <mesh key={rx} position={[-0.02, 0.07, 0.02 + rx]} rotation-y={-Math.PI / 2} raycast={() => null}>
            <boxGeometry args={[0.004, 0.032, 0.045]} />
            <meshBasicMaterial color="#c084fc" toneMapped={false} />
          </mesh>
        ))}
        {/* Card đồ hoạ GPU rời */}
        <group position={[-0.02, -0.04, 0.01]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <mesh>
            <boxGeometry args={[0.26, 0.042, 0.045]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {[-0.06, 0.06].map((gx) => (
            <mesh key={gx} position={[gx, 0, 0.024]}>
              <cylinderGeometry args={[0.02, 0.02, 0.004, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          ))}
        </group>
        {/* Hầm nguồn PSU che đáy */}
        <mesh position={[0, -0.15, 0]} raycast={() => null}>
          <boxGeometry args={[0.24, 0.075, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Chồng sách đặt trên nóc case */}
        <group position={[0.02, 0.205, -0.02]} raycast={() => null}>
          {/* Cuốn sách xanh dương đậm bên dưới */}
          <group position={[0, 0.012, 0]}>
            <RoundedBox args={[0.18, 0.024, 0.24]} radius={0.003} smoothness={2}>
              <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
            </RoundedBox>
            <mesh position={[0.005, 0, 0]}>
              <boxGeometry args={[0.165, 0.02, 0.23]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.9} />
            </mesh>
          </group>
          {/* Cuốn sách xanh ngọc / mint bên trên hơi lệch góc */}
          <group position={[-0.01, 0.034, 0.01]} rotation-y={0.08}>
            <RoundedBox args={[0.17, 0.022, 0.23]} radius={0.003} smoothness={2}>
              <meshStandardMaterial color="#0d9488" roughness={0.6} />
            </RoundedBox>
            <mesh position={[0.005, 0, 0]}>
              <boxGeometry args={[0.155, 0.018, 0.22]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.9} />
            </mesh>
          </group>
        </group>

        {/* ĐÈN BÓNG TRÒN VINTAGE EDISON PHÁT SÁNG VÀNG ẤM ÁP */}
        <group position={[0.01, 0.32, -0.02]}>
          {/* Đế đèn gỗ tiện tròn */}
          <mesh position={[0, -0.035, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.046, 0.05, 0.022, 24]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} />
          </mesh>
          {/* Đui đèn kim loại đồng thau */}
          <mesh position={[0, -0.014, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.022, 0.022, 0.026, 18]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Bóng đèn thuỷ tinh trong suốt */}
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.05, 24, 24]} />
            <meshStandardMaterial
              color="#fef08a"
              transparent
              opacity={0.35}
              roughness={0.1}
              metalness={0.1}
            />
          </mesh>
          {/* Tim đèn dây tóc Edison zíc zắc phát sáng rực rỡ */}
          <group position={[0, 0.005, 0]} raycast={() => null}>
            <mesh>
              <cylinderGeometry args={[0.004, 0.004, 0.036, 8]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.015, 0]}>
              <torusGeometry args={[0.012, 0.003, 8, 16]} />
              <meshBasicMaterial color="#fbbf24" toneMapped={false} />
            </mesh>
          </group>
          {/* Vầng hào quang sáng ấm áp */}
          <mesh position={[0, 0, 0]} raycast={() => null}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshBasicMaterial
              map={glow}
              color="#fef08a"
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Nguồn sáng PointLight thật toả khắp bàn */}
          <pointLight color="#ffe082" intensity={2.2} distance={3.2} decay={1.8} />
        </group>
      </group>
    </group>
  )
}
