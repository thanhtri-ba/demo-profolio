'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROFILE } from '@/lib/profile'
import { live } from '@/lib/mood'
import { glowTexture } from '@/lib/textures'
import { music, TRACKS } from '@/lib/music'

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

type AppId = 'vscode' | 'projects' | 'terminal' | 'snake' | 'music' | 'cv'
type CodeTab = 'profile' | 'skills' | 'contact'

// ─────────────────────────────────────────────────────────────────────────────
// 1. MÀN HÌNH CHÍNH (GIỮA): HỆ ĐIỀU HÀNH CYBER-OS HOÀN CHỈNH
// ─────────────────────────────────────────────────────────────────────────────
const DESKTOP_APPS: { id: AppId; name: string; icon: string; desc: string; badgeColor: string }[] = [
  { id: 'vscode', name: 'VS Code', icon: '📝', desc: 'Trình soạn thảo mã nguồn', badgeColor: '#00f5d4' },
  { id: 'projects', name: 'Projects', icon: '📁', desc: 'Trình duyệt dự án web', badgeColor: '#ffd60a' },
  { id: 'terminal', name: 'Terminal', icon: '💻', desc: 'Cyber ZSH Console', badgeColor: '#00ff88' },
  { id: 'snake', name: 'Retro Game', icon: '👾', desc: 'Neon Snake Arcade', badgeColor: '#ff007f' },
  { id: 'music', name: 'Cyber FM', icon: '🎵', desc: 'Trình phát nhạc Lo-fi', badgeColor: '#9d4edd' },
  { id: 'cv', name: 'Resume.pdf', icon: '📄', desc: 'Hồ sơ năng lực CV', badgeColor: '#38bdf8' },
]

function drawDesktop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  state: {
    activeApp: AppId
    openWindows: Set<AppId>
    activeTab: CodeTab
    startMenuOpen: boolean
    termCmd: string
  },
  hover: string | null
): Hit[] {
  const hits: Hit[] = []

  // 1. Hình nền Desktop: Cyberpunk Aurora & Grid
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#070913')
  bg.addColorStop(0.45, '#0e1326')
  bg.addColorStop(0.8, '#180e2b')
  bg.addColorStop(1, '#080511')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Lưới viễn cận mờ ảo dưới đáy hình nền
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H - 44)
    ctx.stroke()
  }
  for (let y = 0; y < H - 44; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Watermark hệ điều hành giữa màn hình
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.font = `800 64px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CYBER-OS // 2026', W / 2, (H - 44) / 2)
  ctx.font = `600 16px ${MONO}`
  ctx.fillStyle = 'rgba(0, 245, 212, 0.15)'
  ctx.fillText('BATTLESTATION WORKSTATION · CORE i9 · RTX 4090', W / 2, (H - 44) / 2 + 50)

  // 2. Icon Desktop (Cột bên trái)
  DESKTOP_APPS.forEach((app, i) => {
    const ix = 24
    const iy = 26 + i * 86
    const iw = 78
    const ih = 74
    const isHovered = hover === `d_${app.id}`
    const isActive = state.activeApp === app.id

    if (isHovered || isActive) {
      ctx.fillStyle = isHovered ? 'rgba(0, 245, 212, 0.18)' : 'rgba(255, 255, 255, 0.08)'
      rr(ctx, ix, iy, iw, ih, 10)
      ctx.fill()
      ctx.strokeStyle = isHovered ? '#00f5d4' : 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      rr(ctx, ix, iy, iw, ih, 10)
      ctx.stroke()
    }

    // Biểu tượng App Icon
    ctx.font = '28px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(app.icon, ix + iw / 2, iy + 30)

    // Tên App
    ctx.font = `600 11.5px ${FONT}`
    ctx.fillStyle = isHovered ? '#ffffff' : '#cbd5e1'
    ctx.fillText(app.name, ix + iw / 2, iy + 58)

    hits.push({
      id: `d_${app.id}`,
      x: ix,
      y: iy,
      w: iw,
      h: ih,
      run: () => {
        state.activeApp = app.id
        state.openWindows.add(app.id)
        state.startMenuOpen = false
      },
    })
  })

  // 3. Cửa Sổ Ứng Dụng Đang Mở (Main Window)
  const wx = 120
  const wy = 24
  const ww = W - 144
  const wh = H - 44 - 48

  // Bóng đổ cửa sổ
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  rr(ctx, wx + 6, wy + 6, ww, wh, 14)
  ctx.fill()

  // Khung Cửa Sổ
  ctx.fillStyle = '#0f1322'
  rr(ctx, wx, wy, ww, wh, 14)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)'
  ctx.lineWidth = 1.5
  rr(ctx, wx, wy, ww, wh, 14)
  ctx.stroke()

  // Title Bar của Cửa Sổ (35px)
  const tbh = 38
  ctx.fillStyle = '#161c30'
  rr(ctx, wx, wy, ww, tbh, 14)
  ctx.fill()
  ctx.fillRect(wx, wy + tbh - 14, ww, 14) // phủ phẳng góc dưới titlebar

  // Window Controls (3 nút màu macOS)
  // Close (Đỏ)
  ctx.fillStyle = hover === 'win_close' ? '#ff3b30' : '#ff5f56'
  ctx.beginPath()
  ctx.arc(wx + 22, wy + tbh / 2, 7, 0, Math.PI * 2)
  ctx.fill()
  hits.push({
    id: 'win_close',
    x: wx + 12,
    y: wy + 8,
    w: 20,
    h: 22,
    run: () => {
      state.openWindows.delete(state.activeApp)
      const remain = Array.from(state.openWindows)
      if (remain.length > 0) state.activeApp = remain[remain.length - 1]
    },
  })

  // Minimize (Vàng)
  ctx.fillStyle = '#ffbd2e'
  ctx.beginPath()
  ctx.arc(wx + 44, wy + tbh / 2, 7, 0, Math.PI * 2)
  ctx.fill()

  // Maximize (Lục)
  ctx.fillStyle = '#27c93f'
  ctx.beginPath()
  ctx.arc(wx + 66, wy + tbh / 2, 7, 0, Math.PI * 2)
  ctx.fill()

  // Tiêu đề Cửa Sổ
  const curApp = DESKTOP_APPS.find((a) => a.id === state.activeApp) ?? DESKTOP_APPS[0]
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 13.5px ${FONT}`
  ctx.fillStyle = '#f1f5f9'
  ctx.fillText(`${curApp.icon} ${curApp.name} — CyberOS Application`, wx + ww / 2, wy + tbh / 2)

  // 4. Nội Dung Chi Tiết Bên Trong Cửa Sổ
  const cx = wx
  const cy = wy + tbh
  const cw = ww
  const ch = wh - tbh

  if (state.activeApp === 'vscode') {
    // ─────────────── VS CODE WINDOW ───────────────
    // Sub-Tabs bar
    ctx.fillStyle = '#101426'
    ctx.fillRect(cx, cy, cw, 34)

    const tabs: { id: CodeTab; label: string; icon: string }[] = [
      { id: 'profile', label: 'profile.ts', icon: 'TS' },
      { id: 'skills', label: 'skills.json', icon: '{}' },
      { id: 'contact', label: 'contact.md', icon: 'MD' },
    ]

    tabs.forEach((tb, i) => {
      const tx = cx + 16 + i * 140
      const isAct = state.activeTab === tb.id
      ctx.fillStyle = isAct ? '#1a223a' : '#14182b'
      rr(ctx, tx, cy + 4, 130, 30, 6)
      ctx.fill()

      if (isAct) {
        ctx.fillStyle = '#00f5d4'
        ctx.fillRect(tx, cy + 4, 130, 2)
      }

      ctx.font = `700 11px ${MONO}`
      ctx.fillStyle = '#00f5d4'
      ctx.textAlign = 'left'
      ctx.fillText(tb.icon, tx + 10, cy + 19)

      ctx.font = `600 12.5px ${FONT}`
      ctx.fillStyle = isAct ? '#ffffff' : '#94a3b8'
      ctx.fillText(tb.label, tx + 34, cy + 19)

      hits.push({
        id: `tab_${tb.id}`,
        x: tx,
        y: cy + 4,
        w: 130,
        h: 30,
        run: () => {
          state.activeTab = tb.id
        },
      })
    })

    // Editor Body
    ctx.fillStyle = '#0b0e1b'
    ctx.fillRect(cx, cy + 34, cw, ch - 34)

    // Sidebar mini explorer
    ctx.fillStyle = '#0d1122'
    ctx.fillRect(cx, cy + 34, 46, ch - 34)
    ;['📄', '🔍', '⎇', '🐞', '📦'].forEach((ic, i) => {
      ctx.font = '15px system-ui'
      ctx.textAlign = 'center'
      ctx.fillStyle = i === 0 ? '#00f5d4' : '#475569'
      ctx.fillText(ic, cx + 23, cy + 62 + i * 36)
    })

    // Code lines content
    let lines: string[] = []
    if (state.activeTab === 'profile') {
      lines = [
        '// ⚡ PHẠM THÀNH TRÍ — SENIOR FULL-STACK & 3D WEB DEVELOPER',
        'export const profile = {',
        `  name: "${PROFILE.name}",`,
        `  role: "${PROFILE.role}",`,
        '  specialties: ["React Three Fiber", "Next.js 16", "WebGL Shaders", ".NET Core"],',
        '  architecture: "High-Performance 3D Web & Interactive AI Agents",',
        '  status: "🟢 Available for high-impact creative engineering",',
        '  motto: "Transforming 2D Web into Immersive 3D Reality",',
        '};',
      ]
    } else if (state.activeTab === 'skills') {
      lines = [
        '{',
        '  "frontend": ["Next.js 16", "React 19", "Three.js", "R3F", "GLSL Shaders"],',
        '  "backend": [".NET 9", "C#", "Node.js", "FastAPI", "PostgreSQL"],',
        '  "ai_stack": ["LLM Agentic Systems", "LangChain", "Vector DB", "OpenAI API"],',
        '  "devops": ["Docker", "Vercel", "GitHub Actions", "Turbopack", "AWS"]',
        '}',
      ]
    } else {
      lines = [
        '# 📬 Get In Touch',
        `Email: ${PROFILE.email}`,
        `GitHub: ${PROFILE.github}`,
        `LinkedIn: ${PROFILE.linkedin}`,
        '',
        '> "Sẵn sàng hợp tác xây dựng những sản phẩm công nghệ đột phá."',
      ]
    }

    ctx.font = `500 15px ${MONO}`
    lines.forEach((ln, idx) => {
      const ly = cy + 64 + idx * 26
      ctx.fillStyle = '#334155'
      ctx.textAlign = 'right'
      ctx.fillText(String(idx + 1), cx + 80, ly)

      ctx.textAlign = 'left'
      ctx.fillStyle = ln.startsWith('//') || ln.startsWith('#') || ln.startsWith('>') ? '#64748b' : ln.includes('"') ? '#a7f3d0' : '#e2e8f0'
      ctx.fillText(ln, cx + 96, ly)
    })

    // Cursor nhấp nháy
    if (Math.floor(t * 3) % 2 === 0) {
      ctx.fillStyle = '#00f5d4'
      ctx.fillRect(cx + 96, cy + 64 + lines.length * 26 - 12, 2.5, 18)
    }
  } else if (state.activeApp === 'projects') {
    // ─────────────── PROJECTS BROWSER WINDOW ───────────────
    // URL Bar
    ctx.fillStyle = '#101528'
    ctx.fillRect(cx, cy, cw, 40)
    ctx.fillStyle = '#1c243f'
    rr(ctx, cx + 16, cy + 6, cw - 32, 28, 6)
    ctx.fill()
    ctx.font = `500 12.5px ${MONO}`
    ctx.textAlign = 'left'
    ctx.fillStyle = '#00f5d4'
    ctx.fillText('🔒 https://thanhtri.dev/portfolio/repositories', cx + 32, cy + 20)

    // Project Grid (4 card lớn)
    const cardW = (cw - 48) / 2
    const cardH = (ch - 40 - 36) / 2
    PROFILE.projects.slice(0, 4).forEach((pr, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const px = cx + 16 + col * (cardW + 16)
      const py = cy + 52 + row * (cardH + 12)
      const isCardHv = hover === `proj_${i}`

      ctx.fillStyle = isCardHv ? 'rgba(30, 41, 69, 0.95)' : 'rgba(18, 25, 45, 0.85)'
      rr(ctx, px, py, cardW, cardH, 10)
      ctx.fill()
      ctx.strokeStyle = isCardHv ? '#00f5d4' : 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = isCardHv ? 2 : 1
      rr(ctx, px, py, cardW, cardH, 10)
      ctx.stroke()

      // Dải màu
      ctx.fillStyle = ['#00f5d4', '#ff007f', '#ffd60a', '#a855f7'][i]
      rr(ctx, px, py, 6, cardH, 3)
      ctx.fill()

      // Tên dự án
      ctx.font = `700 16px ${FONT}`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(pr.title, px + 18, py + 26)

      // Mô tả
      ctx.font = `500 12px ${FONT}`
      ctx.fillStyle = '#94a3b8'
      ctx.fillText((pr.desc ?? '').slice(0, 48) + '...', px + 18, py + 52)

      // Tag & Nút mở
      ctx.font = `600 11px ${MONO}`
      ctx.fillStyle = '#38bdf8'
      ctx.fillText(pr.meta ?? '', px + 18, py + 80)

      ctx.fillStyle = isCardHv ? '#00f5d4' : 'rgba(255, 255, 255, 0.12)'
      rr(ctx, px + cardW - 74, py + 62, 60, 26, 6)
      ctx.fill()
      ctx.fillStyle = isCardHv ? '#070913' : '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText('XEM ↗', px + cardW - 44, py + 75)
      ctx.textAlign = 'left'

      hits.push({
        id: `proj_${i}`,
        x: px,
        y: py,
        w: cardW,
        h: cardH,
        run: () => {
          if (pr.href) window.open(pr.href, '_blank', 'noopener')
        },
      })
    })
  } else if (state.activeApp === 'terminal') {
    // ─────────────── TERMINAL WINDOW ───────────────
    ctx.fillStyle = '#070a12'
    ctx.fillRect(cx, cy, cw, ch)

    const termLines = [
      'thanhtri@cyber-battlestation:~$ neofetch --cyber',
      '  ██████╗ ██╗   ██╗██████╗ ███████╗██████╗      OS: CyberOS 64-bit x86_64',
      ' ██╔════╝ ╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗     Host: Battlestation Dev Rig',
      ' ██║       ╚████╔╝ ██████╔╝█████╗  ██████╔╝     Kernel: 6.8.4-cyber-lowlatency',
      ' ██║        ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗     Uptime: 24 days, 16 hours',
      ' ╚██████╗    ██║   ██████╔╝███████╗██║  ██║     Shell: zsh 5.9 (x86_64)',
      '  ╚═════╝    ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝     CPU: AMD Ryzen 9 7950X3D (32) @ 5.7GHz',
      '                                                GPU: NVIDIA GeForce RTX 4090 24GB',
      'thanhtri@cyber-battlestation:~$ ./deploy_production.sh',
      '[SUCCESS] All 3D Assets compiled cleanly with Turbopack in 911ms. Status: LIVE.',
      'thanhtri@cyber-battlestation:~$ █',
    ]

    ctx.font = `500 13px ${MONO}`
    termLines.forEach((ln, i) => {
      ctx.fillStyle = i === 0 || i === 8 ? '#00f5d4' : i === 9 ? '#00ff88' : '#7dd3fc'
      ctx.fillText(ln, cx + 20, cy + 30 + i * 22)
    })
  } else if (state.activeApp === 'music') {
    // ─────────────── MUSIC PLAYER WINDOW ───────────────
    ctx.fillStyle = '#0f111f'
    ctx.fillRect(cx, cy, cw, ch)

    const tr = TRACKS[music.index]
    ctx.textAlign = 'center'
    ctx.font = '54px system-ui'
    ctx.fillText('💿', cx + cw / 2, cy + 80)

    ctx.font = `700 24px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(tr.title, cx + cw / 2, cy + 130)

    ctx.font = `500 14px ${FONT}`
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`${tr.artist} · ${tr.mood}`, cx + cw / 2, cy + 155)

    // Equalizer bars
    const lv = music.levels(16)
    for (let i = 0; i < 16; i++) {
      const h = Math.max(6, lv[i] * 60)
      ctx.fillStyle = '#00f5d4'
      ctx.fillRect(cx + cw / 2 - 120 + i * 16, cy + 220 - h, 10, h)
    }

    // Playback Controls
    ctx.fillStyle = '#1c243f'
    rr(ctx, cx + cw / 2 - 80, cy + 240, 160, 42, 21)
    ctx.fill()
    ctx.font = `700 15px ${MONO}`
    ctx.fillStyle = '#00f5d4'
    ctx.fillText(music.playing ? '❚❚ PAUSE' : '▶ PLAY', cx + cw / 2, cy + 261)

    hits.push({
      id: 'music_toggle',
      x: cx + cw / 2 - 80,
      y: cy + 240,
      w: 160,
      h: 42,
      run: () => {
        if (music.playing) music.pause()
        else void music.play()
      },
    })
  } else {
    // ─────────────── RESUME / SNAKE WINDOW ───────────────
    ctx.fillStyle = '#0d1120'
    ctx.fillRect(cx, cy, cw, ch)
    ctx.textAlign = 'center'
    ctx.font = `700 22px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('HỒ SƠ NĂNG LỰC // PHẠM THÀNH TRÍ', cx + cw / 2, cy + 80)
    ctx.font = `500 14px ${FONT}`
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Tải bản CV PDF đầy đủ để xem chi tiết quá trình học tập & công tác', cx + cw / 2, cy + 115)

    ctx.fillStyle = '#00f5d4'
    rr(ctx, cx + cw / 2 - 100, cy + 150, 200, 44, 10)
    ctx.fill()
    ctx.fillStyle = '#070913'
    ctx.font = `700 14px ${FONT}`
    ctx.fillText('📥 TẢI CV BẢN PDF', cx + cw / 2, cy + 174)

    hits.push({
      id: 'cv_download',
      x: cx + cw / 2 - 100,
      y: cy + 150,
      w: 200,
      h: 44,
      run: () => {
        if (PROFILE.cv) window.open(PROFILE.cv, '_blank', 'noopener')
      },
    })
  }

  // 5. Thanh Taskbar / Dock Ở Cạnh Dưới (Height = 44px)
  const tby = H - 44
  ctx.fillStyle = 'rgba(10, 14, 25, 0.92)'
  ctx.fillRect(0, tby, W, 44)
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tby)
  ctx.lineTo(W, tby)
  ctx.stroke()

  // Nút Start Menu (Góc trái)
  const isStartHv = hover === 'task_start'
  ctx.fillStyle = isStartHv || state.startMenuOpen ? '#00f5d4' : 'rgba(255, 255, 255, 0.08)'
  rr(ctx, 10, tby + 5, 88, 34, 8)
  ctx.fill()
  ctx.font = `700 13px ${FONT}`
  ctx.fillStyle = isStartHv || state.startMenuOpen ? '#070913' : '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('❖ START', 54, tby + 22)

  hits.push({
    id: 'task_start',
    x: 10,
    y: tby + 5,
    w: 88,
    h: 34,
    run: () => {
      state.startMenuOpen = !state.startMenuOpen
    },
  })

  // Các Icon Ứng Dụng Trên Taskbar
  DESKTOP_APPS.forEach((app, i) => {
    const ax = 110 + i * 44
    const isAct = state.activeApp === app.id
    const isHv = hover === `tb_${app.id}`

    if (isAct || isHv) {
      ctx.fillStyle = isAct ? 'rgba(0, 245, 212, 0.22)' : 'rgba(255, 255, 255, 0.1)'
      rr(ctx, ax, tby + 5, 38, 34, 6)
      ctx.fill()
    }

    ctx.font = '18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(app.icon, ax + 19, tby + 21)

    // Đèn LED báo ứng dụng đang chạy
    if (state.openWindows.has(app.id)) {
      ctx.fillStyle = isAct ? '#00f5d4' : '#64748b'
      ctx.fillRect(ax + 14, tby + 36, 10, 2.5)
    }

    hits.push({
      id: `tb_${app.id}`,
      x: ax,
      y: tby + 5,
      w: 38,
      h: 34,
      run: () => {
        state.activeApp = app.id
        state.openWindows.add(app.id)
        state.startMenuOpen = false
      },
    })
  })

  // System Tray Góc Phải (Pin, Wifi, Loa, Đồng Hồ Thời Gian Thực)
  ctx.textAlign = 'right'
  ctx.font = `600 12.5px ${MONO}`
  ctx.fillStyle = '#94a3b8'
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false })
  ctx.fillText(`📶 5G   🔊 100%   ⚡   ${timeStr}`, W - 18, tby + 22)

  // 6. Start Menu Popup Nếu Đang Mở
  if (state.startMenuOpen) {
    const smw = 260
    const smh = 320
    const smx = 10
    const smy = tby - smh - 8

    ctx.fillStyle = '#0f1426'
    rr(ctx, smx, smy, smw, smh, 12)
    ctx.fill()
    ctx.strokeStyle = '#00f5d4'
    ctx.lineWidth = 1.5
    rr(ctx, smx, smy, smw, smh, 12)
    ctx.stroke()

    // Avatar User
    ctx.fillStyle = '#1e293b'
    rr(ctx, smx + 14, smy + 14, 44, 44, 22)
    ctx.fill()
    ctx.font = '22px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('👨‍💻', smx + 36, smy + 36)

    ctx.textAlign = 'left'
    ctx.font = `700 14px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(PROFILE.name, smx + 68, smy + 28)
    ctx.font = `500 11px ${MONO}`
    ctx.fillStyle = '#00f5d4'
    ctx.fillText('ADMINISTRATOR // DEV', smx + 68, smy + 46)

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.moveTo(smx + 14, smy + 70)
    ctx.lineTo(smx + smw - 14, smy + 70)
    ctx.stroke()

    // Danh sách App nhanh trong Start Menu
    DESKTOP_APPS.slice(0, 5).forEach((ap, idx) => {
      const sy = smy + 82 + idx * 42
      const isSmHv = hover === `sm_${ap.id}`
      if (isSmHv) {
        ctx.fillStyle = 'rgba(0, 245, 212, 0.15)'
        rr(ctx, smx + 12, sy, smw - 24, 36, 6)
        ctx.fill()
      }
      ctx.font = '18px system-ui'
      ctx.fillText(ap.icon, smx + 24, sy + 18)
      ctx.font = `600 13px ${FONT}`
      ctx.fillStyle = isSmHv ? '#00f5d4' : '#e2e8f0'
      ctx.fillText(ap.name, smx + 56, sy + 18)

      hits.push({
        id: `sm_${ap.id}`,
        x: smx + 12,
        y: sy,
        w: smw - 24,
        h: 36,
        run: () => {
          state.activeApp = ap.id
          state.openWindows.add(ap.id)
          state.startMenuOpen = false
        },
      })
    })
  }

  return hits
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MÀN HÌNH TRÁI: SYSTEM TELEMETRY & HARDWARE GAUGES (640×640)
// ─────────────────────────────────────────────────────────────────────────────
function drawSystemDashboard(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#070a14'
  ctx.fillRect(0, 0, W, H)

  // Viền sáng HUD
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(14, 14, W - 28, H - 28)

  // Header
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `800 13px ${MONO}`
  ctx.fillStyle = '#00f5d4'
  ctx.fillText('// HARDWARE TELEMETRY & SENSORS', 28, 38)

  // 1. Đồng Hồ CPU / GPU Vòng Tròn
  const cpuLoad = Math.floor(38 + 12 * Math.sin(t * 1.5))
  const gpuLoad = Math.floor(65 + 18 * Math.cos(t * 1.2))

  // CPU Gauge
  const drawGauge = (x: number, y: number, label: string, val: number, color: string, sub: string) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(x, y, 46, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = color
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(x, y, 46, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * val) / 100)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.font = `800 20px ${MONO}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${val}%`, x, y - 4)
    ctx.font = `600 11px ${MONO}`
    ctx.fillStyle = color
    ctx.fillText(label, x, y + 16)
    ctx.font = `500 10.5px ${FONT}`
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(sub, x, y + 68)
  }

  drawGauge(120, 120, 'CPU LOAD', cpuLoad, '#00f5d4', '4.8 GHz · 42°C')
  drawGauge(300, 120, 'GPU LOAD', gpuLoad, '#ff007f', 'RTX 4090 · 56°C')
  drawGauge(480, 120, 'VRAM', 48, '#ffd60a', '11.8 / 24 GB')

  // 2. RAM Usage Bar
  ctx.textAlign = 'left'
  ctx.font = `700 12.5px ${MONO}`
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText('DDR5 6400MHz MEMORY USAGE (21.4 GB / 64 GB)', 28, 230)
  ctx.fillStyle = '#161d33'
  rr(ctx, 28, 245, W - 56, 14, 7)
  ctx.fill()
  ctx.fillStyle = '#00f5d4'
  rr(ctx, 28, 245, (W - 56) * 0.33, 14, 7)
  ctx.fill()

  // 3. Network Live Speed
  ctx.fillStyle = '#12172b'
  rr(ctx, 28, 285, W - 56, 68, 10)
  ctx.fill()
  ctx.font = `700 12px ${MONO}`
  ctx.fillStyle = '#00f5d4'
  ctx.fillText('FIBER 10Gbps DUPLEX', 44, 308)
  ctx.font = `600 16px ${MONO}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText('▲ 142.8 MB/s      ▼ 894.2 MB/s', 44, 334)

  // 4. Git Repositories Status
  ctx.font = `800 13px ${MONO}`
  ctx.fillStyle = '#00f5d4'
  ctx.fillText('// GITHUB REPO ACTIVITY (thanhtri-ba)', 28, 395)

  const commits = [
    { msg: 'feat: Cyber Battlestation Real OS Desktop', time: 'Just now', branch: 'main' },
    { msg: 'fix: Camera responsive viewport auto-fit', time: '18m ago', branch: 'main' },
    { msg: 'perf: 3D Canvas GPU shader acceleration', time: '1h ago', branch: 'dev' },
    { msg: 'feat: 4 Cyberpunk neon lighting themes', time: '3h ago', branch: 'main' },
  ]

  commits.forEach((c, i) => {
    const cy = 415 + i * 48
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    rr(ctx, 28, cy, W - 56, 40, 8)
    ctx.fill()

    ctx.font = `600 13px ${FONT}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(c.msg, 42, cy + 18)

    ctx.font = `500 11px ${MONO}`
    ctx.fillStyle = '#64748b'
    ctx.fillText(`${c.branch} · ${c.time}`, 42, cy + 32)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MÀN HÌNH PHẢI: NEON SNAKE ARCADE GAME (800×500)
// ─────────────────────────────────────────────────────────────────────────────
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
  ctx.fillStyle = '#050d0a'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#0a1d15'
  ctx.fillRect(0, 0, W, 52)
  ctx.fillStyle = '#00ff88'
  ctx.fillRect(0, 50, W, 2)

  ctx.font = `800 17px ${MONO}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#00ff88'
  ctx.fillText('🕹️ NEON SNAKE 2077 // ARCADE EDITION', 22, 26)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#79ffe1'
  ctx.fillText(`SCORE: ${String(g.score).padStart(2, '0')}    HIGH: ${String(g.best).padStart(2, '0')}`, W - 22, 26)

  const ox = (W - COLS * CELL) / 2
  const oy = 52 + (H - 52 - ROWS * CELL) / 2

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

  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 2
  ctx.strokeRect(ox, oy, COLS * CELL, ROWS * CELL)

  // Quả cầu năng lượng
  const pulse = 0.8 + 0.25 * Math.sin(t * 9)
  const fx = ox + (g.food.x + 0.5) * CELL
  const fy = oy + (g.food.y + 0.5) * CELL

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

  // Thân rắn
  g.snake.forEach((s, i) => {
    const isHead = i === 0
    const color = isHead ? '#ffffff' : `hsl(${160 - i * 4}, 100%, ${55 - Math.min(i, 20)}%)`
    ctx.fillStyle = color
    ctx.shadowColor = isHead ? '#00f5d4' : '#00ff88'
    ctx.shadowBlur = isHead ? 20 : 10
    rr(ctx, ox + s.x * CELL + 2.5, oy + s.y * CELL + 2.5, CELL - 5, CELL - 5, isHead ? 8 : 5)
    ctx.fill()
  })
  ctx.shadowBlur = 0

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

    ctx.font = `500 14px ${MONO}`
    ctx.fillStyle = '#82aaff'
    ctx.fillText('PHÍM: [W] [A] [S] [D] HOẶC MŨI TÊN (ĐIỆN THOẠI: CHẠM ĐỂ RẼ)', W / 2, oy + (ROWS * CELL) / 2 + 48)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BÀN PHÍM CƠ RGB & THẢM CHUỘT
// ─────────────────────────────────────────────────────────────────────────────
function drawKeys(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#090a10'
  ctx.fillRect(0, 0, W, H)

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

      ctx.fillStyle = isSpecial ? 'rgba(0, 245, 212, 0.85)' : `hsl(${hue}, 95%, 48%)`
      rr(ctx, i * kw + 3, r * kh + 3, kw - 6, kh - 6, 5)
      ctx.fill()

      ctx.fillStyle = '#121420'
      rr(ctx, i * kw + 5, r * kh + 5, kw - 10, kh - 10, 4)
      ctx.fill()

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
  ctx.fillStyle = '#080910'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(123, 59, 255, 0.45)'
  ctx.lineWidth = 4
  rr(ctx, 4, 4, W - 8, H - 8, 12)
  ctx.stroke()

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

    ctx.fillStyle = 'rgba(0, 245, 212, 0.3)'
    ctx.beginPath()
    ctx.arc(160 + i * 40, y + 25, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.font = `700 13px ${MONO}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('CYBERPUNK BATTLESTATION // ED. 2026', W - 24, H - 16)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MAIN COMPONENT: 3D CYBERPUNK BATTLESTATION DESK
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

  // Canvas textures cho 3 màn hình + bàn phím + thảm
  const desktop = useMemo(() => makeScreen(1024, 640), [])
  const telemetry = useMemo(() => makeScreen(640, 640), [])
  const snk = useMemo(() => makeScreen(800, 500), [])
  const keys = useMemo(() => makeScreen(1024, 320), [])
  const mat = useMemo(() => makeScreen(1024, 340), [])

  // State tương tác của hệ điều hành Desktop
  const osState = useRef({
    activeApp: 'vscode' as AppId,
    openWindows: new Set<AppId>(['vscode', 'projects']),
    activeTab: 'profile' as CodeTab,
    startMenuOpen: false,
    termCmd: 'neofetch',
  })

  const game = useRef<Game>(newGame())
  const desktopHits = useRef<Hit[]>([])
  const hover = useRef<string | null>(null)
  const fan = useRef<THREE.Mesh[]>([])
  const aioRing = useRef<THREE.Mesh>(null)
  const strip = useRef<THREE.Mesh>(null)
  const ambientHalo = useRef<THREE.Mesh>(null)
  const frame = useRef(0)
  const root = useRef<THREE.Group>(null)

  // Khởi tạo Deskmat
  useEffect(() => {
    const c = mat.canvas.getContext('2d')!
    drawDeskmat(c, mat.w, mat.h)
    mat.tex.needsUpdate = true
  }, [mat])

  // Phím tắt điều khiển Snake & bàn phím
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
      // 1. Vẽ màn hình giữa (Cyber-OS)
      let c = desktop.canvas.getContext('2d')!
      desktopHits.current = drawDesktop(c, desktop.w, desktop.h, t, osState.current, hover.current)
      desktop.tex.needsUpdate = true

      // 2. Vẽ màn hình trái (Telemetry)
      c = telemetry.canvas.getContext('2d')!
      drawSystemDashboard(c, telemetry.w, telemetry.h, t)
      telemetry.tex.needsUpdate = true

      // 3. Vẽ màn hình phải (Snake Arcade)
      c = snk.canvas.getContext('2d')!
      drawSnake(c, snk.w, snk.h, g, t)
      snk.tex.needsUpdate = true

      // 4. Bàn phím cơ RGB
      c = keys.canvas.getContext('2d')!
      drawKeys(c, keys.w, keys.h, t)
      keys.tex.needsUpdate = true
    }

    // Quạt tản nhiệt quay
    fan.current.forEach((m, i) => {
      if (!m) return
      m.rotation.z = t * (2.8 + i * 0.5)
      ;(m.material as THREE.MeshBasicMaterial).color
        .setHSL((t * 0.15 + i * 0.12) % 1, 1, 0.55)
        .multiplyScalar(live.neon + 0.3)
    })

    // Tản nhiệt AIO
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

  const chassisMetal = '#10121a'
  const bezelMetal = '#08090e'

  return (
    <group ref={root} visible={false} position={position} rotation-y={yaw}>
      {/* ─── TƯỜNG PHÒNG BATTLESTATION PHÍA SAU ─── */}
      <mesh position={[0, 0.45, -0.42]} raycast={() => null}>
        <planeGeometry args={[3.4, 1.8]} />
        <meshBasicMaterial color="#07080f" toneMapped={false} />
      </mesh>

      {/* Đèn Nanoleaf Neon hình lục giác treo tường */}
      <group position={[0, 0.82, -0.41]} raycast={() => null}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
          <mesh key={i} position={[x, i % 2 === 0 ? 0.08 : -0.04, 0]} rotation-z={(i * Math.PI) / 3}>
            <ringGeometry args={[0.08, 0.095, 6]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#00f5d4' : '#ff007f'} toneMapped={false} />
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

      {/* Chân bàn kim loại chữ K */}
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, -0.215, 0.12]}>
          <mesh raycast={() => null}>
            <boxGeometry args={[0.04, 0.38, 0.52]} />
            <meshBasicMaterial color="#0a0c14" toneMapped={false} />
          </mesh>
          <mesh rotation-x={0.4} position={[0, 0, -0.08]} raycast={() => null}>
            <boxGeometry args={[0.03, 0.36, 0.03]} />
            <meshBasicMaterial color="#161a29" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* ─── THẢM CHUỘT CIRCUIT + BÀN PHÍM CƠ + CHUỘT GAMING ─── */}
      <mesh position={[0, 0.001, 0.25]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.05, 0.34]} />
        <meshBasicMaterial map={mat.tex} toneMapped={false} />
      </mesh>

      {/* Bàn phím cơ RGB nghiêng góc công thái học */}
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
        <mesh position={[0, 0.011, -0.022]} raycast={() => null}>
          <boxGeometry args={[0.008, 0.008, 0.018]} />
          <meshBasicMaterial color="#00f5d4" toneMapped={false} />
        </mesh>
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
        {[-0.035, 0.035].map((x) => (
          <mesh key={x} position={[x, 0.09, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
            <torusGeometry args={[0.026, 0.008, 8, 24]} />
            <meshBasicMaterial color="#00f5d4" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* ─── MÀN HÌNH CHÍNH (GIỮA): HỆ ĐIỀU HÀNH CYBER-OS THẬT ─── */}
      <group position={[0, 0.26, -0.02]}>
        <RoundedBox args={[0.76, 0.48, 0.026]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        {/* Mặt hiển thị Canvas Desktop OS */}
        <mesh
          position={[0, 0, 0.0135]}
          onClick={(e) => {
            e.stopPropagation()
            if (!active) {
              onActivate()
              return
            }
            const p = uvToXY(e.uv, desktop.w, desktop.h)
            if (p) {
              const hit = desktopHits.current.find(
                (h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h
              )
              hit?.run()
            }
          }}
          onPointerMove={(e) => {
            e.stopPropagation()
            let h: string | null = null
            if (active) {
              const p = uvToXY(e.uv, desktop.w, desktop.h)
              if (p) {
                h =
                  desktopHits.current.find(
                    (x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h
                  )?.id ?? null
              }
            }
            hover.current = h
            document.body.style.cursor = !active || h ? 'pointer' : 'default'
          }}
          onPointerOut={() => {
            hover.current = null
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[0.73, 0.455]} />
          <meshBasicMaterial map={desktop.tex} toneMapped={false} />
        </mesh>
        {/* Ambilight */}
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
        {/* Chân đế */}
        <mesh position={[0, -0.26, -0.02]} raycast={() => null}>
          <boxGeometry args={[0.06, 0.08, 0.03]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.295, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.26, 0.009, 0.16]} />
          <meshBasicMaterial color={chassisMetal} toneMapped={false} />
        </mesh>
      </group>

      {/* ─── MÀN HÌNH TRÁI: HARDWARE GAUGES & REPO STATUS ─── */}
      <group position={[-0.64, 0.24, 0.06]} rotation-y={0.46}>
        <RoundedBox args={[0.48, 0.48, 0.024]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0125]}>
          <planeGeometry args={[0.45, 0.45]} />
          <meshBasicMaterial map={telemetry.tex} toneMapped={false} />
        </mesh>
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

      {/* ─── MÀN HÌNH PHẢI: ARCADE GAME ─── */}
      <group position={[0.64, 0.24, 0.06]} rotation-y={-0.46}>
        <RoundedBox args={[0.52, 0.35, 0.024]} radius={0.01} smoothness={3} raycast={() => null}>
          <meshBasicMaterial color={bezelMetal} toneMapped={false} />
        </RoundedBox>
        <mesh
          position={[0, 0, 0.0125]}
          onClick={(e) => {
            e.stopPropagation()
            if (!active) {
              onActivate()
              return
            }
            const g = game.current
            if (g.state !== 'play') {
              const b = g.best
              game.current = newGame(b)
              game.current.state = 'play'
              return
            }
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
          }}
          onPointerMove={(e) => {
            e.stopPropagation()
            document.body.style.cursor = active ? 'pointer' : 'default'
          }}
          onPointerOut={() => {
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[0.49, 0.315]} />
          <meshBasicMaterial map={snk.tex} toneMapped={false} />
        </mesh>
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
        <RoundedBox args={[0.24, 0.44, 0.42]} radius={0.012} smoothness={2} raycast={() => null}>
          <meshBasicMaterial color="#090b12" toneMapped={false} />
        </RoundedBox>

        <mesh position={[0, 0, 0.211]} raycast={() => null}>
          <planeGeometry args={[0.21, 0.41]} />
          <meshBasicMaterial color="#030408" toneMapped={false} />
        </mesh>

        {/* 3 Quạt RGB mặt trước */}
        {[0.13, 0, -0.13].map((y, i) => (
          <group key={i} position={[0, y, 0.212]} raycast={() => null}>
            <mesh ref={(el) => { if (el) fan.current[i] = el }}>
              <torusGeometry args={[0.046, 0.007, 8, 32]} />
              <meshBasicMaterial color="#00f5d4" toneMapped={false} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.038, 6]} />
              <meshBasicMaterial color="#ff007f" transparent opacity={0.4} toneMapped={false} />
            </mesh>
          </group>
        ))}

        {/* Kính cường lực bên hông */}
        <mesh position={[0.121, 0, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[0.38, 0.4]} />
          <meshBasicMaterial color="#1a2035" transparent opacity={0.35} toneMapped={false} />
        </mesh>

        {/* GPU RTX 4090 */}
        <mesh position={[0.02, -0.06, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.08, 0.03, 0.26]} />
          <meshBasicMaterial color="#161b2b" toneMapped={false} />
        </mesh>
        <mesh position={[0.062, -0.06, 0.02]} raycast={() => null}>
          <boxGeometry args={[0.003, 0.012, 0.24]} />
          <meshBasicMaterial color="#00f5d4" toneMapped={false} />
        </mesh>

        {/* AIO Cooler CPU */}
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

        {/* 2 Thanh RAM RGB */}
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
