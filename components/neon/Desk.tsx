'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { glowTexture } from '@/lib/textures'
import { engine } from '@/lib/audio'

const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'

export type PCPowerState = 'off' | 'booting' | 'on'

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
// 1. THẢM CẮT KỸ THUẬT (CUTTING MAT / GRID DESKMAT) CHÂN THỰC
// ─────────────────────────────────────────────────────────────────────────────
function drawCuttingMat(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#21252d'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#475164'
  ctx.lineWidth = 3
  rr(ctx, 6, 6, W - 12, H - 12, 12)
  ctx.stroke()

  ctx.strokeStyle = '#384050'
  ctx.lineWidth = 1.5
  rr(ctx, 18, 18, W - 36, H - 36, 6)
  ctx.stroke()

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

  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.font = '700 11px system-ui'
  ctx.fillStyle = 'rgba(203, 213, 225, 0.35)'
  ctx.fillText('SELF-HEALING CUTTING MAT  //  A1  850×500mm', W - 35, H - 8)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BÀN PHÍM CƠ CHÂN THỰC (CHERRY PROFILE)
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
// 3. HIỂN THỊ MÀN HÌNH TẮT (POWER OFF GLASS REFLECTION)
// ─────────────────────────────────────────────────────────────────────────────
function renderScreenOff(ctx: CanvasRenderingContext2D, W: number, H: number, showHint = false) {
  // Nền kính đen sâu unlit
  ctx.fillStyle = '#080a0f'
  ctx.fillRect(0, 0, W, H)

  // Vệt phản chiếu ánh sáng chéo trên mặt kính đen
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, 'rgba(255, 255, 255, 0.035)')
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.012)')
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.45)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  if (showHint) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 13px ${FONT}`
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'
    ctx.fillText('⏻ MÁY TÍNH ĐANG TẮT  ·  BẤM NÚT NGUỒN TRÊN THÙNG CASE ĐỂ BẬT', W / 2, H * 0.5)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HIỂN THỊ KHỞI ĐỘNG (BOOT SEQUENCE: BIOS + WINDOWS 11 LOADING)
// ─────────────────────────────────────────────────────────────────────────────
function renderMainMonitorBooting(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number
) {
  if (progress < 0.45) {
    // ─── GIAI ĐOẠN 1: BIOS SPLASH SCREEN ───
    ctx.fillStyle = '#04060a'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#38bdf8'
    ctx.font = '800 26px "Plus Jakarta Sans", system-ui'
    ctx.fillText('⬡ THANHTRI BATTLESTATION  //  UEFI BIOS v2.6', W / 2, H * 0.3)

    ctx.font = '600 13px monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('CPU: AMD Ryzen 9 7950X 16-Core Processor 4.5GHz ............. [ OK ]', W / 2, H * 0.42)
    ctx.fillText('MEMORY: Corsair Vengeance 64GB DDR5 6000MHz Dual-Channel ..... [ OK ]', W / 2, H * 0.48)
    ctx.fillText('GPU: NVIDIA GeForce RTX 4090 24GB GDDR6X PCIe 4.0 ........... [ OK ]', W / 2, H * 0.54)
    ctx.fillText('STORAGE: Samsung 990 Pro 2TB NVMe SSD PCIe Gen4 .............. [ OK ]', W / 2, H * 0.60)

    ctx.fillStyle = '#22c55e'
    ctx.fillText('Checking Peripherals: Keyboard, Mouse, Audio DSP ............. [ READY ]', W / 2, H * 0.68)

    ctx.font = '500 12px monospace'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Press DEL or F2 to enter UEFI Setup  |  F12 for BBS PopUp', W / 2, H * 0.8)
  } else {
    // ─── GIAI ĐOẠN 2: WINDOWS 11 SPINNER LOADER ───
    ctx.fillStyle = '#0b0f19'
    ctx.fillRect(0, 0, W, H)

    // Logo Windows 11 ở giữa (4 ô vuông cyan)
    const lw = 22
    const lg = 4
    const lx = W / 2 - lw - lg / 2
    const ly = H * 0.42 - lw - lg / 2
    ctx.fillStyle = '#0284c7'
    ctx.fillRect(lx, ly, lw, lw)
    ctx.fillRect(lx + lw + lg, ly, lw, lw)
    ctx.fillRect(lx, ly + lw + lg, lw, lw)
    ctx.fillRect(lx + lw + lg, ly + lw + lg, lw, lw)

    // Vòng quay chấm tròn Windows (Spinning dots)
    const t = Date.now() / 240
    const dotCount = 6
    const radius = 24
    for (let i = 0; i < dotCount; i++) {
      const a = t - i * 0.28
      const cx = W / 2 + Math.cos(a) * radius
      const cy = H * 0.65 + Math.sin(a) * radius
      ctx.fillStyle = `rgba(56, 189, 248, ${Math.max(0.1, 1 - i * 0.16)})`
      ctx.beginPath()
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.font = `600 14px ${FONT}`
    ctx.fillStyle = '#cbd5e1'
    ctx.textAlign = 'center'
    ctx.fillText('Đang nạp Windows 11...', W / 2, H * 0.76)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MÀN HÌNH CHÍNH HOẠT ĐỘNG (WINDOWS 11 DESKTOP KHI MÁY BẬT)
// ─────────────────────────────────────────────────────────────────────────────
function renderMainMonitor(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wallImg: HTMLImageElement | null,
  hover: string | null,
  startMenuOpen: boolean,
  onShutDown: () => void
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
        if (idx === 0) onShutDown()
        else if (idx === 3 || idx === 4) window.open(PROFILE.github, '_blank', 'noopener')
      },
    })
  })

  // Start Menu Popup khi bấm nút Start 🪟
  if (startMenuOpen) {
    const smW = 220
    const smH = 140
    const smX = W / 2 - smW / 2
    const smY = tby - smH - 8

    ctx.fillStyle = 'rgba(20, 26, 38, 0.94)'
    rr(ctx, smX, smY, smW, smH, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    rr(ctx, smX, smY, smW, smH, 10)
    ctx.stroke()

    // Header Start Menu
    ctx.textAlign = 'left'
    ctx.font = `700 13px ${FONT}`
    ctx.fillStyle = '#f8fafc'
    ctx.fillText('Phạm Thành Trí', smX + 16, smY + 28)
    ctx.font = `500 11px ${FONT}`
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Fullstack & 3D Web Dev', smX + 16, smY + 46)

    // Nút Tắt máy tính (Shut Down)
    const btnHv = hover === 'sm_shutdown'
    ctx.fillStyle = btnHv ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.18)'
    rr(ctx, smX + 12, smY + 80, smW - 24, 38, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'
    rr(ctx, smX + 12, smY + 80, smW - 24, 38, 6)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.font = `600 12.5px ${FONT}`
    ctx.fillStyle = '#fca5a5'
    ctx.fillText('⏻ Tắt Máy Tính (Shut Down)', smX + smW / 2, smY + 100)

    hits.push({
      id: 'sm_shutdown',
      x: smX + 12,
      y: smY + 80,
      w: smW - 24,
      h: 38,
      run: onShutDown,
    })
  }

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
// 6. MÀN HÌNH TRÁI
// ─────────────────────────────────────────────────────────────────────────────
function renderLeftMonitor(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wallImg: HTMLImageElement | null,
  powerState: PCPowerState
) {
  if (powerState === 'off') {
    renderScreenOff(ctx, W, H, false)
    return
  }
  if (powerState === 'booting') {
    ctx.fillStyle = '#060910'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 15px monospace'
    ctx.fillStyle = '#38bdf8'
    ctx.fillText('SECONDARY DISPLAY // STANDBY INITIALIZATION', W / 2, H / 2)
    return
  }

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
// 7. MÀN HÌNH LAPTOP MACBOOK
// ─────────────────────────────────────────────────────────────────────────────
function renderLaptopScreen(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wallImg: HTMLImageElement | null,
  powerState: PCPowerState
) {
  if (powerState === 'off') {
    renderScreenOff(ctx, W, H, false)
    return
  }
  if (powerState === 'booting') {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    ctx.font = '32px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('', W / 2, H * 0.44)

    // Thanh loading Apple
    ctx.fillStyle = '#334155'
    rr(ctx, W / 2 - 60, H * 0.65, 120, 4, 2)
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    rr(ctx, W / 2 - 60, H * 0.65, 75, 4, 2)
    ctx.fill()
    return
  }

  if (wallImg && wallImg.complete) {
    ctx.drawImage(wallImg, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
  }

  // macOS Dock
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

  // Trackpad
  ctx.fillStyle = '#e5e7eb'
  rr(ctx, W / 2 - 70, H * 0.62, 140, H * 0.32, 6)
  ctx.fill()
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 1
  rr(ctx, W / 2 - 70, H * 0.62, 140, H * 0.32, 6)
  ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MAIN 3D COMPONENT: BÀN MÁY TÍNH VỚI CƠ CHẾ BẬT NGUỒN PC TƯƠNG TÁC
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

  // Trạng thái nguồn máy tính: 'off' | 'booting' | 'on'
  const [powerState, setPowerState] = useState<PCPowerState>('off')
  const [powerHovered, setPowerHovered] = useState(false)
  const [powerPressed, setPowerPressed] = useState(false)
  const [startMenuOpen, setStartMenuOpen] = useState(false)

  const bootProgressRef = useRef(0)
  const wallImgRef = useRef<HTMLImageElement | null>(null)
  const hitsRef = useRef<Hit[]>([])
  const hoverRef = useRef<string | null>(null)
  const root = useRef<THREE.Group>(null)
  const timeRef = useRef(0)

  // Hàm chuyển đổi bật / tắt máy tính (Power Toggle)
  const togglePower = useCallback(() => {
    setPowerPressed(true)
    setTimeout(() => setPowerPressed(false), 220)

    if (powerState === 'off') {
      engine.pcPowerOn()
      setPowerState('booting')
      setStartMenuOpen(false)
      window.dispatchEvent(new CustomEvent('neon-pc-power-changed', { detail: { state: 'booting' } }))

      const startTime = Date.now()
      const bootDuration = 2400

      const tick = () => {
        const elapsed = Date.now() - startTime
        const prog = Math.min(1, elapsed / bootDuration)
        bootProgressRef.current = prog

        if (prog < 1) {
          requestAnimationFrame(tick)
        } else {
          setPowerState('on')
          window.dispatchEvent(new CustomEvent('neon-pc-power-changed', { detail: { state: 'on' } }))
        }
      }
      requestAnimationFrame(tick)
    } else {
      engine.pcPowerOff()
      setPowerState('off')
      setStartMenuOpen(false)
      bootProgressRef.current = 0
      window.dispatchEvent(new CustomEvent('neon-pc-power-changed', { detail: { state: 'off' } }))
    }
  }, [powerState])

  // Lắng nghe sự kiện toggle nguồn từ giao diện Overlay
  useEffect(() => {
    const onPowerToggle = () => togglePower()
    window.addEventListener('neon-pc-power-toggle', onPowerToggle)
    return () => window.removeEventListener('neon-pc-power-toggle', onPowerToggle)
  }, [togglePower])

  // Tải hình ảnh Mặt Trăng & Rừng thông
  useEffect(() => {
    const img = new Image()
    img.src = '/textures/moon-forest.jpg'
    img.onload = () => {
      wallImgRef.current = img
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
  }, [laptopKeys, mechKeyboard, deskmat])

  // Cập nhật từng frame hiển thị các màn hình
  useFrame(({ clock }) => {
    timeRef.current = clock.elapsedTime
    if (root.current) root.current.visible = active
    if (!active) return

    // 1. Cập nhật màn hình chính
    const mc = mainScreen.canvas.getContext('2d')!
    if (powerState === 'off') {
      renderScreenOff(mc, mainScreen.w, mainScreen.h, true)
      hitsRef.current = []
    } else if (powerState === 'booting') {
      renderMainMonitorBooting(mc, mainScreen.w, mainScreen.h, bootProgressRef.current)
      hitsRef.current = []
    } else {
      hitsRef.current = renderMainMonitor(
        mc,
        mainScreen.w,
        mainScreen.h,
        wallImgRef.current,
        hoverRef.current,
        startMenuOpen,
        () => setStartMenuOpen((prev) => !prev)
      )
    }
    mainScreen.tex.needsUpdate = true

    // 2. Cập nhật màn hình trái
    const lc = leftScreen.canvas.getContext('2d')!
    renderLeftMonitor(lc, leftScreen.w, leftScreen.h, wallImgRef.current, powerState)
    leftScreen.tex.needsUpdate = true

    // 3. Cập nhật laptop
    const lapC = laptopScreen.canvas.getContext('2d')!
    renderLaptopScreen(lapC, laptopScreen.w, laptopScreen.h, wallImgRef.current, powerState)
    laptopScreen.tex.needsUpdate = true
  })

  const uvToXY = (uv: THREE.Vector2 | undefined, w: number, h: number) =>
    uv ? { x: uv.x * w, y: (1 - uv.y) * h } : null

  // Màu sắc động quạt tản nhiệt RGB
  const t = timeRef.current
  const fanRgbColor = `hsl(${(t * 120) % 360}, 90%, 55%)`
  const ramRgbColor = `hsl(${(t * 80 + 180) % 360}, 90%, 65%)`

  return (
    <group ref={root} position={position} rotation-y={yaw}>
      {/* ─── NGUỒN SÁNG PHÒNG STUDIO CHÂN THỰC ─── */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[-1.2, 2.5, 2.2]} intensity={1.1} />

      {/* ─── TƯỜNG PHÒNG STUDIO XÁM NHẠT (NHƯ ẢNH 2) ─── */}
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

      {/* Chân bàn kim loại */}
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
            if (powerState === 'off') {
              togglePower()
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
            if (active && powerState === 'on') {
              const p = uvToXY(e.uv, mainScreen.w, mainScreen.h)
              if (p) {
                h = hitsRef.current.find((x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h)?.id ?? null
              }
            }
            hoverRef.current = h
            document.body.style.cursor = !active || h || powerState === 'off' ? 'pointer' : 'default'
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
          <meshBasicMaterial
            color={powerState === 'off' ? '#262a34' : '#fffbeb'}
            toneMapped={false}
          />
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
            <meshBasicMaterial color={powerState !== 'off' ? '#38bdf8' : '#1e293b'} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ─── LAPTOP MACBOOK MỞ MÀN HÌNH ĐẶT NGAY DƯỚI MÀN HÌNH CHÍNH ─── */}
      <group position={[0.04, 0.008, 0.18]}>
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
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.034, 0.02, 0.06, 20]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
        </mesh>
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
        <mesh position={[0, 0.012, -0.016]}>
          <boxGeometry args={[0.008, 0.006, 0.02]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* ─── CASE MÁY TÍNH + CHỒNG SÁCH + ĐÈN BÓNG BẦU ĐIỆN VÀNG (CHUẨN ẢNH 2) ─── */}
      <group position={[0.58, 0.18, -0.16]} rotation-y={-0.2}>
        {/* Vỏ case PC đen */}
        <RoundedBox args={[0.26, 0.38, 0.42]} radius={0.01} smoothness={2} raycast={() => null}>
          <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.5} />
        </RoundedBox>

        {/* ─── CỤM NÚT NGUỒN CƠ HỌC BẬT MÁY TÍNH TƯƠNG TÁC TRÊN NÓC CASE ─── */}
        <group position={[0.05, 0.191, 0.14]}>
          {/* Vành kim loại bao quanh nút nguồn */}
          <mesh>
            <cylinderGeometry args={[0.016, 0.018, 0.004, 24]} />
            <meshStandardMaterial color="#1e2430" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Nút bấm vật lý (Ấn xuống khi bấm) */}
          <mesh
            position={[0, powerPressed ? 0.001 : 0.003, 0]}
            onClick={(e) => {
              e.stopPropagation()
              togglePower()
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setPowerHovered(true)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setPowerHovered(false)
              document.body.style.cursor = ''
            }}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.005, 24]} />
            <meshStandardMaterial
              color={powerHovered ? '#38bdf8' : '#0f172a'}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>

          {/* Vòng LED phát sáng quanh nút nguồn (Đổi màu theo trạng thái) */}
          <mesh position={[0, 0.006, 0]}>
            <torusGeometry args={[0.009, 0.0018, 12, 24]} />
            <meshBasicMaterial
              color={
                powerState === 'off'
                  ? Math.sin(t * 3) > 0 ? '#f59e0b' : '#78350f'
                  : powerState === 'booting'
                  ? Math.sin(t * 12) > 0 ? '#38bdf8' : '#0369a1'
                  : '#22c55e'
              }
              toneMapped={false}
            />
          </mesh>

          {/* Cổng cắm USB mặt trên */}
          <mesh position={[-0.035, 0.002, 0]}>
            <boxGeometry args={[0.012, 0.002, 0.006]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
          <mesh position={[-0.055, 0.002, 0]}>
            <boxGeometry args={[0.012, 0.002, 0.006]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>

          {/* Bảng hiệu chỉ dẫn Hologram bay lơ lửng khi máy đang TẮT */}
          {powerState === 'off' && (
            <group position={[0, 0.08 + Math.sin(t * 4) * 0.006, 0]}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation()
                  togglePower()
                }}
                onPointerOver={() => {
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                  document.body.style.cursor = ''
                }}
              >
                <planeGeometry args={[0.22, 0.045]} />
                <meshBasicMaterial color="#0284c7" transparent opacity={0.85} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0, 0.002]}>
                <planeGeometry args={[0.21, 0.04]} />
                <meshBasicMaterial color="#0369a1" toneMapped={false} />
              </mesh>
            </group>
          )}
        </group>

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

        {/* Đèn LED standby bo mạch chủ (khi tắt máy vẫn sáng chấm cam nhỏ) */}
        <mesh position={[-0.038, 0.1, 0.08]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <circleGeometry args={[0.0025, 12]} />
          <meshBasicMaterial color="#f97316" toneMapped={false} />
        </mesh>

        {/* CPU Cooler tản nhiệt có quạt LED tròn đổi màu RGB */}
        <group position={[-0.02, 0.06, -0.04]} rotation-y={-Math.PI / 2} raycast={() => null}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.035, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
          {powerState !== 'off' && (
            <mesh position={[0, 0.018, 0]}>
              <torusGeometry args={[0.038, 0.004, 12, 24]} />
              <meshBasicMaterial color={fanRgbColor} toneMapped={false} />
            </mesh>
          )}
        </group>

        {/* Thanh RAM RGB */}
        {[-0.01, 0.01].map((rx) => (
          <mesh key={rx} position={[-0.02, 0.07, 0.02 + rx]} rotation-y={-Math.PI / 2} raycast={() => null}>
            <boxGeometry args={[0.004, 0.032, 0.045]} />
            <meshBasicMaterial
              color={powerState === 'off' ? '#1e293b' : ramRgbColor}
              toneMapped={false}
            />
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
          {powerState !== 'off' && (
            <mesh position={[0, 0.022, 0.01]}>
              <boxGeometry args={[0.18, 0.002, 0.02]} />
              <meshBasicMaterial color="#38bdf8" toneMapped={false} />
            </mesh>
          )}
        </group>

        {/* Hầm nguồn PSU che đáy */}
        <mesh position={[0, -0.15, 0]} raycast={() => null}>
          <boxGeometry args={[0.24, 0.075, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Chồng sách đặt trên nóc case */}
        <group position={[0.02, 0.205, -0.02]} raycast={() => null}>
          <group position={[0, 0.012, 0]}>
            <RoundedBox args={[0.18, 0.024, 0.24]} radius={0.003} smoothness={2}>
              <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
            </RoundedBox>
            <mesh position={[0.005, 0, 0]}>
              <boxGeometry args={[0.165, 0.02, 0.23]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.9} />
            </mesh>
          </group>
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

        {/* ĐÈN BÓNG TRÒN VINTAGE EDISON PHÁT SÁNG VÀNG ẤM ÁP (ĐÃ CÂN CHỈNH ÊM DỊU) */}
        <group position={[0.01, 0.32, -0.02]}>
          <mesh position={[0, -0.035, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.046, 0.05, 0.022, 24]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.014, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.022, 0.022, 0.026, 18]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.3} />
          </mesh>
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
          {/* Hào quang vàng ấm êm dịu, không bị chói loá tường */}
          <mesh position={[0, 0, 0]} raycast={() => null}>
            <planeGeometry args={[0.26, 0.26]} />
            <meshBasicMaterial
              map={glow}
              color="#fef08a"
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Nguồn sáng PointLight vàng ấm tự nhiên */}
          <pointLight color="#ffe082" intensity={0.75} distance={1.8} decay={2} />
        </group>
      </group>
    </group>
  )
}
