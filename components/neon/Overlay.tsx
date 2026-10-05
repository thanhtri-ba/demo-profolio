'use client'
import { useEffect, useState, useSyncExternalStore, useCallback, useRef, useMemo } from 'react'
import { useProgress } from '@react-three/drei'
import { CAMERA_PRESETS, type Sign, type CameraPreset } from '@/lib/signs'
import { music, TRACKS } from '@/lib/music'
import { TIME_LABELS, WEATHER_LABELS, type TimeOfDay, type Weather } from '@/lib/mood'
import { PROFILE } from '@/lib/profile'

type Props = {
  signs: Sign[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  time: TimeOfDay
  setTime: (t: TimeOfDay) => void
  weather: Weather
  setWeather: (w: Weather) => void
  sound: boolean
  toggleSound: () => void
  quality: 'high' | 'low'
  setQuality: (q: 'high' | 'low') => void
  cameraPreset: CameraPreset
  setCameraPreset: (preset: CameraPreset) => void
}

type ThemeMode = 'cyber' | 'matrix' | 'amber' | 'synthwave'

function useMusic() {
  return useSyncExternalStore(music.subscribe, music.getSnapshot, music.getSnapshot)
}

const NAV_SHORTCUTS = [
  { id: 'projects', label: 'Dự án', icon: '🚀', tag: 'PROJ' },
  { id: 'about', label: 'Hồ sơ', icon: '👤', tag: 'BIO' },
  { id: 'skills', label: 'Kỹ năng', icon: '⚡', tag: 'TECH' },
  { id: 'experience', label: 'Kinh nghiệm', icon: '💼', tag: 'EXP' },
  { id: 'music', label: 'Music TV', icon: '🎵', tag: 'AUDIO' },
  { id: 'desk', label: 'Góc Dev', icon: '🕹️', tag: 'LAB' },
  { id: 'contact', label: 'Liên hệ', icon: '📬', tag: 'PING' },
]

/** Real-time animated audio spectrum visualizer using music.levels */
function AudioWaveVisualizer({ count = 10, active = false }: { count?: number; active?: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(count).fill(0.1))

  useEffect(() => {
    let frameId: number
    const update = () => {
      if (active) {
        const lv = music.levels(count)
        setBars(Array.from(lv))
      } else {
        setBars(Array(count).fill(0.08))
      }
      frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [active, count])

  return (
    <div className="audio-wave-visualizer" aria-hidden="true">
      {bars.map((v, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{ height: `${Math.max(12, Math.min(100, Math.round(v * 100)))}%` }}
        />
      ))}
    </div>
  )
}

export function Overlay(p: Props) {
  const { progress, active: loading } = useProgress()
  const current = p.signs.find((s) => s.id === p.activeId)
  const [envOpen, setEnvOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [hint, setHint] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isTouring, setIsTouring] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('cyber')
  const [crtEffect, setCrtEffect] = useState(false)
  const [projectFilter, setProjectFilter] = useState<'all' | '3d' | 'fullstack' | 'ai'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [clock, setClock] = useState('')
  const m = useMusic()

  // Real-time Cyber Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('vi-VN', { hour12: false }))
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Trạng thái nguồn máy tính
  const [pcPowerState, setPcPowerState] = useState<'off' | 'booting' | 'on'>('off')
  useEffect(() => {
    const onPowerChanged = (e: Event) => {
      const ce = e as CustomEvent<{ state: 'off' | 'booting' | 'on' }>
      if (ce.detail?.state) setPcPowerState(ce.detail.state)
    }
    window.addEventListener('neon-pc-power-changed', onPowerChanged)
    return () => window.removeEventListener('neon-pc-power-changed', onPowerChanged)
  }, [])

  // Apply Theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Navigation order for prev / next
  const navigableSigns = useRef(p.signs.filter((s) => s.nav || s.id === 'music' || s.id === 'desk')).current
  const currentIndex = p.activeId ? navigableSigns.findIndex((s) => s.id === p.activeId) : -1

  const handlePrev = useCallback(() => {
    if (navigableSigns.length === 0) return
    const prevIdx = (currentIndex - 1 + navigableSigns.length) % navigableSigns.length
    p.onSelect(navigableSigns[prevIdx].id)
  }, [currentIndex, navigableSigns, p])

  const handleNext = useCallback(() => {
    if (navigableSigns.length === 0) return
    const nextIdx = (currentIndex + 1) % navigableSigns.length
    p.onSelect(navigableSigns[nextIdx].id)
  }, [currentIndex, navigableSigns, p])

  // Auto Tour feature
  useEffect(() => {
    if (!isTouring) return
    const tourList = navigableSigns.map((s) => s.id)
    let idx = 0
    p.onSelect(tourList[0])

    const interval = setInterval(() => {
      idx = (idx + 1) % tourList.length
      p.onSelect(tourList[idx])
    }, 7000)

    return () => clearInterval(interval)
  }, [isTouring, navigableSigns, p])

  // Hide hints after initial interaction
  useEffect(() => {
    const hide = () => setHint(false)
    const t = setTimeout(hide, 8000)
    addEventListener('pointerdown', hide, { once: true })
    return () => {
      clearTimeout(t)
      removeEventListener('pointerdown', hide)
    }
  }, [])

  // Keyboard Shortcuts: Command+K for search, + / - for Zoom, 0 for Auto-fit, 1-5 for Presets
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /INPUT|TEXTAREA/.test(t.tagName)) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      } else if (e.key === '+' || e.key === '=') {
        window.dispatchEvent(new CustomEvent('neon-camera-zoom-in'))
      } else if (e.key === '-' || e.key === '_') {
        window.dispatchEvent(new CustomEvent('neon-camera-zoom-out'))
      } else if (e.key === '0' || e.key.toLowerCase() === 'f') {
        window.dispatchEvent(new CustomEvent('neon-camera-fit'))
      } else if (e.key === '1') {
        p.setCameraPreset('default')
      } else if (e.key === '2') {
        p.setCameraPreset('wide')
      } else if (e.key === '3') {
        p.setCameraPreset('isometric')
      } else if (e.key === '4') {
        p.setCameraPreset('street')
      } else if (e.key === '5') {
        p.setCameraPreset('top')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [p])

  const copyEmail = () => {
    navigator.clipboard.writeText(PROFILE.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return PROFILE.projects.filter((proj) => {
      if (projectFilter === 'all') return true
      return proj.category === projectFilter
    })
  }, [projectFilter])

  // Filtered searchable items for Command Palette
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return NAV_SHORTCUTS
    const q = searchQuery.toLowerCase()
    return NAV_SHORTCUTS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    )
  }, [searchQuery])

  // Current Sector Tag
  const sectorTag = current ? `SECTOR // 0${currentIndex + 1}-${current.id.toUpperCase()}` : 'SECTOR // 00-NEON-HUB'

  return (
    <>
      {/* ─── OPTIONAL RETRO CRT OVERLAY ─── */}
      {crtEffect && <div className="crt-overlay" aria-hidden="true" />}

      {/* ─── LOADING SCREEN ─── */}
      <div className={`cyber-loader ${loading ? '' : 'done'}`}>
        <div className="loader-hud">
          <div className="loader-glitch" data-text="NEON STREET 3D">
            NEON STREET 3D
          </div>
          <div className="loader-sub">PHẠM THÀNH TRÍ // CREATIVE PORTFOLIO</div>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="loader-meta">
            <span>WEBGL 2.0 & PROCEDURAL AUDIO</span>
            <span className="loader-percent">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* ─── SCI-FI RETICLE CORNERS ─── */}
      <div className="cyber-frame-corner top-left" aria-hidden="true" />
      <div className="cyber-frame-corner top-right" aria-hidden="true" />
      <div className="cyber-frame-corner bottom-left" aria-hidden="true" />
      <div className="cyber-frame-corner bottom-right" aria-hidden="true" />

      {/* ─── TOP HUD HEADER ─── */}
      <header className="cyber-hud-header">
        <div className="brand-group">
          <button className="brand-badge" onClick={() => p.onClose()} title="Về toàn cảnh phố">
            <span className="brand-glow-dot" />
            <div className="brand-text-col">
              <span className="brand-title">THANHTRI.DEV</span>
              <span className="brand-tag">PORTFOLIO // v2.6</span>
            </div>
          </button>

          {/* Tactical Telemetry Badge */}
          <div className="brand-status">
            <span className="status-live">● ONLINE</span>
            <span className="status-divider">|</span>
            <span className="status-sector">{sectorTag}</span>
            <span className="status-divider">|</span>
            <span className="status-clock">{clock || '22:00:00'} ICT</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Quick Search / Command Palette */}
          <button
            className="cyber-btn search-trigger-btn"
            onClick={() => setCmdOpen(true)}
            title="Mở menu tìm kiếm nhanh (Ctrl+K / ⌘K)"
          >
            <span className="btn-icon">🔍</span>
            <span className="btn-text">TÌM KIẾM</span>
            <kbd className="cyber-kbd">⌘K</kbd>
          </button>

          {/* Tour Mode */}
          <button
            className={`cyber-btn tour-btn ${isTouring ? 'active' : ''}`}
            onClick={() => setIsTouring(!isTouring)}
            title="Tự động bay qua từng khu vực"
          >
            <span className="btn-icon">{isTouring ? '⏹' : '▶'}</span>
            <span className="btn-text">{isTouring ? 'DỪNG TOUR' : 'AUTO TOUR'}</span>
          </button>

          {/* Audio Synthesizer Toggle with Real-time Spectrum */}
          <button
            className={`cyber-btn audio-btn ${p.sound ? 'active' : ''}`}
            onClick={p.toggleSound}
            title={p.sound ? 'Tắt âm thanh môi trường' : 'Bật âm thanh WebAudio synth & mưa'}
          >
            <AudioWaveVisualizer count={5} active={p.sound} />
            <span className="btn-text">{p.sound ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
          </button>

          {/* Environment & Theme Settings HUD */}
          <button
            className={`cyber-btn env-btn ${envOpen ? 'active' : ''}`}
            onClick={() => setEnvOpen(!envOpen)}
            aria-expanded={envOpen}
            title="Tuỳ chỉnh màu neon, thời gian, thời tiết và đồ họa"
          >
            <span className="btn-icon">⚙</span>
            <span className="btn-text">KHÔNG GIAN</span>
          </button>

          {/* GitHub Link */}
          <a
            href={PROFILE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-btn icon-only"
            title="GitHub: thanhtri-ba"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      {/* ─── COMMAND PALETTE MODAL (⌘K) ─── */}
      {cmdOpen && (
        <div className="cyber-modal-backdrop" onClick={() => setCmdOpen(false)}>
          <div className="cyber-command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-header">
              <span className="cmd-search-icon">🔍</span>
              <input
                autoFocus
                type="text"
                placeholder="Tìm dự án, kỹ năng, hoặc nhảy đến địa điểm... (Esc để đóng)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cmd-input"
              />
              <button className="cmd-close" onClick={() => setCmdOpen(false)}>✕</button>
            </div>
            <div className="cmd-list">
              <div className="cmd-group-label">ĐỊA ĐIỂM TRÊN PHỐ 3D</div>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  className="cmd-item"
                  onClick={() => {
                    p.onSelect(item.id)
                    setCmdOpen(false)
                  }}
                >
                  <span className="cmd-item-icon">{item.icon}</span>
                  <span className="cmd-item-title">{item.label}</span>
                  <span className="cmd-item-tag">{item.tag}</span>
                  <span className="cmd-item-arrow">Bay tới ↗</span>
                </button>
              ))}
            </div>
            <div className="cmd-footer">
              <span>Phím tắt: <strong>Esc</strong> để thoát · <strong>↑ ↓</strong> chọn · <strong>Enter</strong> thực thi</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── ENVIRONMENT & THEME CONTROL DRAWER ─── */}
      {envOpen && (
        <div className="cyber-modal-backdrop" onClick={() => setEnvOpen(false)}>
          <div className="cyber-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">
                <span className="accent-bar" />
                <span>TRÌNH ĐIỀU HÀNH KHÔNG GIAN 3D</span>
              </div>
              <button className="drawer-close" onClick={() => setEnvOpen(false)}>✕</button>
            </div>

            <div className="drawer-body">
              {/* Chủ đề màu Neon */}
              <div className="control-section">
                <label className="control-label">
                  <span>MÀU SẮC NEON (THEME)</span>
                  <em>{theme.toUpperCase()}</em>
                </label>
                <div className="theme-selector-grid">
                  <button
                    className={`theme-chip-btn cyber ${theme === 'cyber' ? 'active' : ''}`}
                    onClick={() => setTheme('cyber')}
                  >
                    <span className="chip-preview cyan-magenta" />
                    <span>Neo-Tokyo</span>
                  </button>
                  <button
                    className={`theme-chip-btn matrix ${theme === 'matrix' ? 'active' : ''}`}
                    onClick={() => setTheme('matrix')}
                  >
                    <span className="chip-preview green" />
                    <span>Matrix</span>
                  </button>
                  <button
                    className={`theme-chip-btn amber ${theme === 'amber' ? 'active' : ''}`}
                    onClick={() => setTheme('amber')}
                  >
                    <span className="chip-preview gold" />
                    <span>Blade 2049</span>
                  </button>
                  <button
                    className={`theme-chip-btn synthwave ${theme === 'synthwave' ? 'active' : ''}`}
                    onClick={() => setTheme('synthwave')}
                  >
                    <span className="chip-preview purple" />
                    <span>Synthwave</span>
                  </button>
                </div>
              </div>

              {/* Góc nhìn & Tỉ lệ thành phố */}
              <div className="control-section">
                <label className="control-label">
                  <span>GÓC NHÌN & TỈ LỆ THÀNH PHỐ</span>
                  <em>{CAMERA_PRESETS[p.cameraPreset]?.label}</em>
                </label>
                <div className="camera-preset-grid">
                  {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => {
                    const item = CAMERA_PRESETS[key]
                    return (
                      <button
                        key={key}
                        className={`preset-chip-btn ${p.cameraPreset === key && !p.activeId ? 'active' : ''}`}
                        onClick={() => {
                          if (p.activeId) p.onClose()
                          p.setCameraPreset(key)
                        }}
                      >
                        <span className="preset-icon">{item.icon}</span>
                        <div className="preset-info">
                          <strong>{item.label}</strong>
                          <small>{item.desc}</small>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="camera-quick-actions">
                  <button
                    className="cyber-btn full-width"
                    onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-fit'))}
                  >
                    <span>⟲ Căn chỉnh toàn bộ thành phố vừa khung hình (Fit)</span>
                  </button>
                  <div className="zoom-btn-row">
                    <button
                      className="cyber-btn"
                      onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-zoom-out'))}
                    >
                      <span>－ Thu nhỏ (Zoom Out)</span>
                    </button>
                    <button
                      className="cyber-btn"
                      onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-zoom-in'))}
                    >
                      <span>＋ Phóng to (Zoom In)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Thời gian */}
              <div className="control-section">
                <label className="control-label">
                  <span>CHU KỲ THỜI GIAN</span>
                  <em>{TIME_LABELS[p.time]}</em>
                </label>
                <div className="cyber-pill-group">
                  {(Object.keys(TIME_LABELS) as TimeOfDay[]).map((t) => (
                    <button
                      key={t}
                      className={`pill-btn ${p.time === t ? 'active' : ''}`}
                      onClick={() => p.setTime(t)}
                    >
                      {t === 'night' && '🌙 '}
                      {t === 'dusk' && '🌇 '}
                      {t === 'day' && '☀️ '}
                      {TIME_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thời tiết */}
              <div className="control-section">
                <label className="control-label">
                  <span>HIỆU ỨNG THỜI TIẾT</span>
                  <em>{WEATHER_LABELS[p.weather]}</em>
                </label>
                <div className="cyber-pill-group">
                  {(Object.keys(WEATHER_LABELS) as Weather[]).map((w) => (
                    <button
                      key={w}
                      className={`pill-btn ${p.weather === w ? 'active' : ''}`}
                      onClick={() => p.setWeather(w)}
                    >
                      {w === 'rain' && '🌧️ '}
                      {w === 'storm' && '⚡ '}
                      {w === 'snow' && '❄️ '}
                      {w === 'fog' && '🌫️ '}
                      {w === 'clear' && '✨ '}
                      {WEATHER_LABELS[w]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hiệu ứng CRT Screen & Đồ họa */}
              <div className="control-grid-two">
                <div className="control-section">
                  <label className="control-label"><span>MÀN HÌNH CRT</span></label>
                  <button
                    className={`cyber-toggle-btn ${crtEffect ? 'active' : ''}`}
                    onClick={() => setCrtEffect(!crtEffect)}
                  >
                    {crtEffect ? '📺 Đang bật' : '📺 Đã tắt'}
                  </button>
                </div>
                <div className="control-section">
                  <label className="control-label"><span>CHẤT LƯỢNG 3D</span></label>
                  <div className="cyber-pill-group">
                    <button
                      className={`pill-btn ${p.quality === 'high' ? 'active' : ''}`}
                      onClick={() => p.setQuality('high')}
                    >
                      💎 Cao
                    </button>
                    <button
                      className={`pill-btn ${p.quality === 'low' ? 'active' : ''}`}
                      onClick={() => p.setQuality('low')}
                    >
                      ⚡ Mượt
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <span className="footer-hint">Next.js 16 · Turbopack · React Three Fiber · WebGL 2.0</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── RETRO TV / DESK MODE OVERLAY ─── */}
      {current?.kind === 'music' && (
        <div className="cyber-banner-mode">
          <div className="banner-content">
            <span className="banner-badge">RETRO MUSIC TV</span>
            <span className="banner-text">Bấm vào màn hình TV giữa phố để đổi bài, chỉnh âm lượng hoặc dừng nhạc</span>
          </div>
          <button className="cyber-btn highlight" onClick={p.onClose}>Thoát góc nhìn · ESC</button>
        </div>
      )}

      {current?.kind === 'desk' && (
        <div className="cyber-banner-mode">
          <div className="banner-content">
            <span className="banner-badge">STUDIO BATTLESTATION</span>
            <span className="banner-text">
              {pcPowerState === 'off'
                ? 'Máy tính đang TẮT. Bấm nút nguồn trên Case hoặc nút bên phải để bật!'
                : pcPowerState === 'booting'
                ? 'Đang khởi động UEFI BIOS và nạp Windows 11...'
                : 'Máy tính ĐÃ BẬT. Bấm các ứng dụng trên màn hình (This PC, Dự Án, VS Code...) để mở!'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`cyber-btn ${pcPowerState === 'off' ? 'highlight' : ''}`}
              onClick={() => window.dispatchEvent(new CustomEvent('neon-pc-power-toggle'))}
              title={pcPowerState === 'off' ? 'Bật máy tính' : 'Tắt máy tính'}
            >
              {pcPowerState === 'off' ? '⏻ Bật máy tính' : pcPowerState === 'booting' ? '⟳ Đang khởi động...' : '⏻ Tắt máy'}
            </button>
            <button className="cyber-btn" onClick={p.onClose}>Thoát góc nhìn · ESC</button>
          </div>
        </div>
      )}

      {/* ─── CYBER CONTENT PANEL (HOLOGRAPHIC MODAL) ─── */}
      {current?.content && (
        <aside className="cyber-panel" key={current.id}>
          {/* Animated Gradient Neon Bar */}
          <div className="panel-glow-line" />

          <div className="panel-hud-header">
            <div className="panel-module-tag">
              <span className="tag-bracket">[</span>
              <span className="tag-name">SYSTEM // {current.label.toUpperCase()}</span>
              <span className="tag-bracket">]</span>
            </div>
            <button className="panel-close-btn" onClick={p.onClose} title="Đóng panel (Esc)">✕</button>
          </div>

          <div className="panel-scroll-area">
            <h2 className="panel-title">{current.content.title}</h2>
            {current.content.body && <p className="panel-description">{current.content.body}</p>}

            {/* Special ABOUT ME Dossier View */}
            {current.id === 'about' && (
              <div className="cyber-dossier-card">
                <div className="dossier-header">
                  <div className="dossier-avatar-placeholder">
                    <span>TT</span>
                  </div>
                  <div className="dossier-meta">
                    <strong className="dossier-name">{PROFILE.name}</strong>
                    <span className="dossier-role">{PROFILE.role}</span>
                    <span className="dossier-status">● {PROFILE.status}</span>
                  </div>
                </div>
                <div className="dossier-facts">
                  <div className="fact-item">
                    <span className="fact-label">KHU VỰC</span>
                    <span className="fact-val">{PROFILE.location}</span>
                  </div>
                  <div className="fact-item">
                    <span className="fact-label">CHUYÊN MÔN</span>
                    <span className="fact-val">3D Web & Fullstack</span>
                  </div>
                </div>
              </div>
            )}

            {/* Special SKILLS with Animated Progress Mastery Meters */}
            {current.id === 'skills' && (
              <div className="cyber-skills-wrapper">
                <div className="mastery-section">
                  <div className="sub-section-title">CHỈ SỐ THÀNH THẠO KỸ NĂNG</div>
                  <div className="mastery-grid">
                    {PROFILE.mastery.map((item) => (
                      <div key={item.name} className="mastery-item">
                        <div className="mastery-info">
                          <span className="mastery-name">{item.name}</span>
                          <span className="mastery-pct">{item.level}%</span>
                        </div>
                        <div className="mastery-bar-track">
                          <div className="mastery-bar-fill" style={{ width: `${item.level}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sub-section-title">DANH MỤC CÔNG NGHỆ</div>
                <div className="cyber-skills-container">
                  {Object.entries(PROFILE.skills).map(([category, list]) => (
                    <div key={category} className="skill-cat-card">
                      <div className="skill-cat-title">
                        <span className="cat-dot" />
                        <span>{category}</span>
                      </div>
                      <div className="skill-cat-chips">
                        {list.map((skill) => (
                          <span key={skill} className="skill-chip">{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special PROJECTS with Category Tabs */}
            {current.id === 'projects' && (
              <div className="projects-view-wrap">
                <div className="cyber-tabs-row">
                  <button
                    className={`tab-btn ${projectFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('all')}
                  >
                    Tất cả ({PROFILE.projects.length})
                  </button>
                  <button
                    className={`tab-btn ${projectFilter === '3d' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('3d')}
                  >
                    3D & WebGL
                  </button>
                  <button
                    className={`tab-btn ${projectFilter === 'fullstack' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('fullstack')}
                  >
                    Full-Stack
                  </button>
                  <button
                    className={`tab-btn ${projectFilter === 'ai' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('ai')}
                  >
                    AI / LLM
                  </button>
                </div>

                <div className="cyber-items-list">
                  {filteredProjects.map((it) => (
                    <div key={it.title} className="cyber-item-card project-card">
                      <div className="item-card-top">
                        <div className="project-title-group">
                          {it.badge && <span className="project-badge">{it.badge}</span>}
                          <strong className="item-title">
                            {it.href ? (
                              <a href={it.href} target="_blank" rel="noreferrer" className="item-link">
                                {it.title} <span className="arrow">↗</span>
                              </a>
                            ) : (
                              it.title
                            )}
                          </strong>
                        </div>
                        {it.meta && <span className="item-meta">{it.meta}</span>}
                      </div>
                      {it.desc && <p className="item-desc">{it.desc}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Items (Experience, Blog) */}
            {current.id !== 'skills' && current.id !== 'projects' && current.content.items && (
              <div className="cyber-items-list">
                {current.content.items.map((it) => (
                  <div key={it.title} className="cyber-item-card">
                    <div className="item-card-top">
                      <strong className="item-title">
                        {it.href ? (
                          <a href={it.href} target="_blank" rel="noreferrer" className="item-link">
                            {it.title} <span className="arrow">↗</span>
                          </a>
                        ) : (
                          it.title
                        )}
                      </strong>
                      {it.meta && <span className="item-meta">{it.meta}</span>}
                    </div>
                    {it.desc && <p className="item-desc">{it.desc}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Special Contact Panel */}
            {current.id === 'contact' && (
              <div className="contact-quick-box">
                <div className="email-display">
                  <span>{PROFILE.email}</span>
                  <button className="copy-btn" onClick={copyEmail}>
                    {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
                  </button>
                </div>
                <div className="social-links-grid">
                  <a href={PROFILE.github} target="_blank" rel="noreferrer" className="social-chip">
                    <span>🐙 GitHub: thanhtri-ba</span>
                  </a>
                  <a href={`mailto:${PROFILE.email}`} className="social-chip email">
                    <span>✉ Gửi Email Trực Tiếp</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Panel Actions / Navigation Bar */}
          <div className="panel-footer-actions">
            <div className="nav-controls">
              <button className="cyber-btn small" onClick={handlePrev} title="Bảng hiệu trước">◀ Trước</button>
              <button className="cyber-btn small" onClick={handleNext} title="Bảng hiệu sau">Sau ▶</button>
            </div>
            <div className="main-actions">
              {current.content.cta && (
                <a href={current.content.cta.href} target="_blank" rel="noopener noreferrer" className="cyber-cta-btn">
                  {current.content.cta.label} ↗
                </a>
              )}
              <button className="cyber-btn close" onClick={p.onClose}>
                Đóng <kbd>ESC</kbd>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ─── FLOATING AUDIO DECK (SYNTHWAVE PLAYER) ─── */}
      {m.playing && current?.kind !== 'music' && (
        <div className="cyber-floating-player" role="group" aria-label="Cyber Sound Deck">
          <button
            className="player-disc-btn"
            onClick={() => p.onSelect('music')}
            title="Bay tới TV phát nhạc 3D"
          >
            <span className="vinyl-disc spinning" />
          </button>

          <div className="player-track-meta">
            <div className="track-title-row">
              <span className="now-playing-dot" />
              <strong className="track-name">{TRACKS[m.index].title}</strong>
            </div>
            <div className="track-sub-row">
              <span className="track-artist">{TRACKS[m.index].artist}</span>
              <AudioWaveVisualizer count={6} active={m.playing} />
            </div>
          </div>

          <div className="player-controls">
            <button className="ctrl-btn" onClick={() => music.prev()} title="Bài trước">⏮</button>
            <button className="ctrl-btn play-pause" onClick={() => music.pause()} title="Tạm dừng">❚❚</button>
            <button className="ctrl-btn" onClick={() => music.next()} title="Bài sau">⏭</button>
          </div>
        </div>
      )}


      {/* ─── FLOATING CAMERA & VIEWPORT DOCK ─── */}
      {!loading && !p.activeId && (
        <aside className="cyber-camera-dock" aria-label="Camera & Viewport Controls">
          <div className="camera-dock-group">
            <button
              className="dock-icon-btn highlight"
              onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-fit'))}
              title="Căn chỉnh toàn bộ thành phố vừa vặn màn hình (Phím tắt: 0 hoặc F)"
            >
              <span className="dock-icon">⟲</span>
              <span className="dock-label">Vừa màn hình</span>
            </button>
            <div className="dock-divider" />
            <button
              className="dock-icon-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-zoom-out'))}
              title="Thu nhỏ góc nhìn (Phím tắt: -)"
            >
              <span className="dock-icon">－</span>
            </button>
            <button
              className="dock-icon-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('neon-camera-zoom-in'))}
              title="Phóng to góc nhìn (Phím tắt: +)"
            >
              <span className="dock-icon">＋</span>
            </button>
            <div className="dock-divider" />
            <div className="dock-presets">
              {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => {
                const item = CAMERA_PRESETS[key]
                const active = p.cameraPreset === key
                return (
                  <button
                    key={key}
                    className={`dock-preset-chip ${active ? 'active' : ''}`}
                    onClick={() => p.setCameraPreset(key)}
                    title={`${item.label}: ${item.desc}`}
                  >
                    <span>{item.icon}</span>
                    <span className="dock-chip-text">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      )}

      {/* ─── INTERACTION HINT TOAST ─── */}
      {hint && !loading && !p.activeId && (
        <div className="cyber-hint-toast" aria-hidden="true">
          <span className="hint-pulse" />
          <span>Kéo chuột để xoay · Cuộn để phóng to · Phím 0: Căn vừa màn hình · Phím 1-5: Đổi góc nhìn</span>
        </div>
      )}
    </>
  )
}
