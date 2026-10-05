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
// 1. THẢM CẮT KỸ THUẬT (CUTTING MAT / GRID DESKMAT) CHUẨN XÁC NHƯ ẢNH 2
// ─────────────────────────────────────────────────────────────────────────────
function drawCuttingMat(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Nền xám đen đặc trưng của thảm cắt tự lành (Self-healing mat)
  ctx.fillStyle = '#22262e'
  ctx.fillRect(0, 0, W, H)

  // Viền bao quanh thảm
  ctx.strokeStyle = '#3e4653'
  ctx.lineWidth = 4
  rr(ctx, 4, 4, W - 8, H - 8, 10)
  ctx.stroke()

  // Lưới ô vuông nhỏ (Fine Grid 20px)
  ctx.strokeStyle = 'rgba(156, 163, 175, 0.22)'
  ctx.lineWidth = 1
  for (let x = 16; x < W - 16; x += 20) {
    ctx.beginPath()
    ctx.moveTo(x, 16)
    ctx.lineTo(x, H - 16)
    ctx.stroke()
  }
  for (let y = 16; y < H - 16; y += 20) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(W - 16, y)
    ctx.stroke()
  }

  // Lưới ô vuông lớn chính (Major Grid 100px)
  ctx.strokeStyle = 'rgba(209, 213, 219, 0.42)'
  ctx.lineWidth = 1.5
  for (let x = 16; x < W - 16; x += 100) {
    ctx.beginPath()
    ctx.moveTo(x, 16)
    ctx.lineTo(x, H - 16)
    ctx.stroke()
  }
  for (let y = 16; y < H - 16; y += 100) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(W - 16, y)
    ctx.stroke()
  }

  // Đường phân độ góc 45 độ
  ctx.strokeStyle = 'rgba(156, 163, 175, 0.35)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(16, H - 16)
  ctx.lineTo(Math.min(W - 16, 16 + (H - 32)), 16)
  ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MÀN HÌNH CHÍNH: HÌNH NỀN TRĂNG THỰC + WINDOWS 11 CHUẨN XÁC
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
    // Vẽ bức ảnh Trăng & Rừng thông chân thực 100%
    ctx.drawImage(wallImg, 0, 0, W, H)
  } else {
    // Fallback nền hoàng hôn nếu ảnh đang tải
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  // Các Icon Desktop Windows 11 (2 cột bên trái giống hệt ảnh 2)
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

  // System Tray góc phải (Wifi, Âm lượng, Pin, Ngày Giờ)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `600 11.5px ${FONT}`
  ctx.fillStyle = '#e2e8f0'
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
  ctx.fillText(`ENG   📶 🔊 ⚡   ${timeStr}`, W - 16, tby + 20)

  return hits
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MÀN HÌNH TRÁI: HIỂN THỊ PHẦN NỐI DÀI CỦA HÌNH NỀN
// ─────────────────────────────────────────────────────────────────────────────
function renderLeftMonitor(ctx: CanvasRenderingContext2D, W: number, H: number, wallImg: HTMLImageElement | null) {
  if (wallImg && wallImg.complete) {
    // Cắt nửa trái của bức ảnh Trăng & Rừng thông
    ctx.drawImage(wallImg, 0, 0, wallImg.width * 0.7, wallImg.height, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  // Taskbar phụ
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
// 4. LAPTOP MACBOOK (GIỮA DƯỚI): NỐI DÀI HÌNH NỀN & BÀN PHÍM
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
  // Mặt phím nhôm bạc MacBook
  ctx.fillStyle = '#d1d5db'
  ctx.fillRect(0, 0, W, H)

  // Vùng bàn phím đen
  ctx.fillStyle = '#111317'
  rr(ctx, 30, 20, W - 60, H * 0.55, 6)
  ctx.fill()

  // Phím chiclet đen
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
// 5. MAIN 3D COMPONENT: BÀN MÁY TÍNH THẬT NHƯ ẢNH 2
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

  // Canvas textures cho màn hình & bàn phím & thảm
  const mainScreen = useMemo(() => makeCanvasScreen(1024, 640), [])
  const leftScreen = useMemo(() => makeCanvasScreen(960, 600), [])
  const laptopScreen = useMemo(() => makeCanvasScreen(640, 400), [])
  const laptopKeys = useMemo(() => makeCanvasScreen(640, 420), [])
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

      // Vẽ lên màn hình trái
      const lc = leftScreen.canvas.getContext('2d')!
      renderLeftMonitor(lc, leftScreen.w, leftScreen.h, img)
      leftScreen.tex.needsUpdate = true

      // Vẽ lên laptop
      const lapC = laptopScreen.canvas.getContext('2d')!
      renderLaptopScreen(lapC, laptopScreen.w, laptopScreen.h, img)
      laptopScreen.tex.needsUpdate = true
    }

    // Vẽ bàn phím laptop
    const kc = laptopKeys.canvas.getContext('2d')!
    drawLaptopKeyboard(kc, laptopKeys.w, laptopKeys.h)
    laptopKeys.tex.needsUpdate = true

    // Vẽ thảm cắt caro
    const mc = deskmat.canvas.getContext('2d')!
    drawCuttingMat(mc, deskmat.w, deskmat.h)
    deskmat.tex.needsUpdate = true
  }, [leftScreen, laptopScreen, laptopKeys, deskmat])

  useFrame(() => {
    if (root.current) root.current.visible = active
    if (!active) return

    // Cập nhật màn hình chính (Windows 11)
    const c = mainScreen.canvas.getContext('2d')!
    hitsRef.current = renderMainMonitor(c, mainScreen.w, mainScreen.h, wallImgRef.current, hoverRef.current)
    mainScreen.tex.needsUpdate = true
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) =>
    uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null

  // Vật liệu và màu sắc chân thực phong cách Studio Anime trong ảnh 2
  const deskWood = '#969da8'
  const wallGrey = '#c6cad2'
  const bezelDark = '#181b22'
  const metallic = '#242831'

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* ─── NGUỒN SÁNG VÀNG ẤM ÁP CỦA BÓNG ĐÈN EDISON TRÊN BÀN ─── */}
      <pointLight position={[0.59, 0.52, -0.16]} color="#ffe082" intensity={1.5} distance={3.0} />

      {/* ─── TƯỜNG PHÒNG VÀ GẠCH ỐP STUDIO (SÁNG SỦA, GỌN GÀNG NHƯ ẢNH 2) ─── */}
      <mesh position={[0, 0.46, -0.44]} raycast={() => null}>
        <planeGeometry args={[3.8, 2.0]} />
        <meshBasicMaterial color={wallGrey} toneMapped={false} />
      </mesh>
      {/* Các rãnh chỉ nối tường */}
      {[-1.0, 0, 1.0].map((x) => (
        <mesh key={x} position={[x, 0.46, -0.438]} raycast={() => null}>
          <boxGeometry args={[0.005, 2.0, 0.002]} />
          <meshBasicMaterial color="#a1a7b2" toneMapped={false} />
        </mesh>
      ))}

      {/* Sàn phòng màu xám */}
      <mesh position={[0, -0.399, 0.2]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[3.8, 2.0]} />
        <meshBasicMaterial color="#b2b7c0" toneMapped={false} />
      </mesh>

      {/* ─── BÀN LÀM VIỆC XÁM MINIMALIST CÓ NGĂN KÉO PHẢI (NHƯ ẢNH 2) ─── */}
      <RoundedBox args={[1.75, 0.038, 0.8]} radius={0.008} smoothness={2} position={[0, -0.019, 0.1]} raycast={() => null}>
        <meshBasicMaterial color={deskWood} toneMapped={false} />
      </RoundedBox>

      {/* Chân bàn */}
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, -0.21, 0.1]} raycast={() => null}>
          <boxGeometry args={[0.04, 0.38, 0.72]} />
          <meshBasicMaterial color="#888f9a" toneMapped={false} />
        </mesh>
      ))}
      {/* Ngăn kéo dưới mặt bàn bên phải */}
      <mesh position={[0.55, -0.07, 0.15]} raycast={() => null}>
        <boxGeometry args={[0.38, 0.08, 0.65]} />
        <meshBasicMaterial color="#808894" toneMapped={false} />
      </mesh>
      <mesh position={[0.55, -0.07, 0.476]} raycast={() => null}>
        <boxGeometry args={[0.1, 0.012, 0.015]} />
        <meshBasicMaterial color="#4b5563" toneMapped={false} />
      </mesh>

      {/* ─── THẢM CẮT KẺ LƯỚI CARO (CUTTING MAT TRÊN BÀN) ─── */}
      <mesh position={[-0.04, 0.001, 0.22]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.36, 0.52]} />
        <meshBasicMaterial map={deskmat.tex} toneMapped={false} />
      </mesh>

      {/* ─── MÀN HÌNH CHÍNH (GIỮA): TREO TRÊN TAY ARM, CÓ ĐÈN SCREENBAR ─── */}
      <group position={[0.04, 0.36, -0.03]}>
        <RoundedBox args={[0.74, 0.46, 0.024]} radius={0.008} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelDark} toneMapped={false} />
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
          <meshBasicMaterial color={metallic} toneMapped={false} />
        </mesh>

        {/* Đèn Screenbar (Treo trên đỉnh màn hình chính) */}
        <mesh position={[0, 0.238, 0.025]} raycast={() => null}>
          <boxGeometry args={[0.48, 0.014, 0.018]} />
          <meshBasicMaterial color="#1f232b" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.23, 0.022]} raycast={() => null}>
          <boxGeometry args={[0.44, 0.003, 0.01]} />
          <meshBasicMaterial color="#fffbeb" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH TRÁI: CÓ WEBCAM TRÊN ĐỈNH ─── */}
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

        {/* Webcam kẹp trên đỉnh màn hình trái */}
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

      {/* ─── LAPTOP MACBOOK MỞ MÀN HÌNH ĐẶT NGAY DƯỚI MÀN HÌNH CHÍNH ─── */}
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

      {/* ─── GỐI TỰA CỔ CHỮ U CÓ ĐÔI TAI MÈO (CHUẨN ẢNH 2) ─── */}
      <group position={[-0.28, 0.08, 0.15]} rotation-y={0.25} rotation-z={-0.12} raycast={() => null}>
        <mesh>
          <torusGeometry args={[0.075, 0.032, 16, 28, Math.PI * 1.4]} />
          <meshBasicMaterial color="#b8bec8" toneMapped={false} />
        </mesh>
        {/* Đôi tai mèo trên gối */}
        {[-0.04, 0.04].map((tx) => (
          <mesh key={tx} position={[tx, 0.08, 0]} rotation-z={tx < 0 ? 0.3 : -0.3}>
            <coneGeometry args={[0.016, 0.03, 4]} />
            <meshBasicMaterial color="#9ea6b0" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* ─── BÀN PHÍM CƠ NẰM NGHIÊNG BÊN TRÁI ─── */}
      <group position={[-0.42, 0.02, 0.32]} rotation-y={0.16} rotation-x={-0.08} raycast={() => null}>
        <RoundedBox args={[0.34, 0.024, 0.13]} radius={0.006} smoothness={2}>
          <meshBasicMaterial color="#1e2329" toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0.013, 0]}>
          <boxGeometry args={[0.32, 0.008, 0.115]} />
          <meshBasicMaterial color="#2d333b" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── LOA CUBE TRONG SUỐT CẠNH LAPTOP ─── */}
      <group position={[0.27, 0.05, 0.14]} rotation-y={-0.15} raycast={() => null}>
        <RoundedBox args={[0.09, 0.09, 0.09]} radius={0.01} smoothness={2}>
          <meshBasicMaterial color="#e5e7eb" transparent opacity={0.4} toneMapped={false} />
        </RoundedBox>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.032, 0.016, 0.06, 16]} />
          <meshBasicMaterial color="#d97706" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── CHUỘT TRẮNG CÔNG THÁI HỌC ─── */}
      <group position={[0.32, 0.012, 0.28]} rotation-y={-0.12} raycast={() => null}>
        <RoundedBox args={[0.052, 0.022, 0.085]} radius={0.012} smoothness={3}>
          <meshBasicMaterial color="#f8fafc" toneMapped={false} />
        </RoundedBox>
      </group>

      {/* ─── IPAD / TABLET BẬT TRANH CAMO POP-ART VÀNG & TÍM (ẢNH THỰC TỪ ẢNH 2) ─── */}
      <group position={[0.52, 0.08, 0.24]} rotation-y={-0.42} rotation-x={-0.34}>
        <RoundedBox args={[0.32, 0.22, 0.01]} radius={0.008} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#1f242d" toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0055]} raycast={() => null}>
          <planeGeometry args={[0.305, 0.205]} />
          <meshBasicMaterial map={tabletTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.06, -0.05]} rotation-x={0.6} raycast={() => null}>
          <boxGeometry args={[0.15, 0.12, 0.006]} />
          <meshBasicMaterial color="#374151" toneMapped={false} />
        </mesh>
      </group>

      {/* ─── CASE MÁY TÍNH + CHỒNG SÁCH + ĐÈN BÓNG BẦU ĐIỆN VÀNG (CHUẨN ẢNH 2) ─── */}
      <group position={[0.58, 0.18, -0.16]} rotation-y={-0.2}>
        <RoundedBox args={[0.26, 0.38, 0.42]} radius={0.01} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#181b22" toneMapped={false} />
        </RoundedBox>
        <mesh position={[-0.131, 0, 0]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.38, 0.34]} />
          <meshBasicMaterial color="#2d3340" transparent opacity={0.3} toneMapped={false} />
        </mesh>

        {/* Chồng sách đặt trên nóc case */}
        <group position={[0.02, 0.21, -0.02]} raycast={() => null}>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.24]} />
            <meshBasicMaterial color="#1e3a5f" toneMapped={false} />
          </mesh>
          <mesh position={[-0.01, 0.03, 0.01]}>
            <boxGeometry args={[0.17, 0.018, 0.23]} />
            <meshBasicMaterial color="#2dd4bf" toneMapped={false} />
          </mesh>
        </group>

        {/* ĐÈN BÓNG TRÒN VINTAGE EDISON PHÁT SÁNG VÀNG ẤM ÁP */}
        <group position={[0.01, 0.31, -0.02]}>
          <mesh position={[0, -0.035, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.045, 0.048, 0.02, 18]} />
            <meshBasicMaterial color="#78350f" toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.015, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.022, 0.022, 0.024, 16]} />
            <meshBasicMaterial color="#475569" toneMapped={false} />
          </mesh>
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.048, 20, 20]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.006, 0.006, 0.038, 8]} />
            <meshBasicMaterial color="#f59e0b" toneMapped={false} />
          </mesh>
          {/* Hào quang vàng ấm áp */}
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
