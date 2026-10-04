'use client'
import { useEffect, useState, useSyncExternalStore, useCallback, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import type { Sign } from '@/lib/signs'
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
}

function useMusic() {
  return useSyncExternalStore(music.subscribe, music.getSnapshot, music.getSnapshot)
}

const NAV_SHORTCUTS = [
  { id: 'projects', label: 'Dự án', icon: '🚀' },
  { id: 'about', label: 'Giới thiệu', icon: '👤' },
  { id: 'skills', label: 'Kỹ năng', icon: '⚡' },
  { id: 'experience', label: 'Kinh nghiệm', icon: '💼' },
  { id: 'music', label: 'Music TV', icon: '🎵' },
  { id: 'desk', label: 'Góc Dev', icon: '🕹️' },
  { id: 'contact', label: 'Liên hệ', icon: '📬' },
]

export function Overlay(p: Props) {
  const { progress, active: loading } = useProgress()
  const current = p.signs.find((s) => s.id === p.activeId)
  const [envOpen, setEnvOpen] = useState(false)
  const [hint, setHint] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isTouring, setIsTouring] = useState(false)
  const m = useMusic()

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

  // Hide hints after initial interaction or 8s
  useEffect(() => {
    const hide = () => setHint(false)
    const t = setTimeout(hide, 8000)
    addEventListener('pointerdown', hide, { once: true })
    return () => {
      clearTimeout(t)
      removeEventListener('pointerdown', hide)
    }
  }, [])

  const copyEmail = () => {
    navigator.clipboard.writeText(PROFILE.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ─── LOADING SCREEN ─── */}
      <div className={`cyber-loader ${loading ? '' : 'done'}`}>
        <div className="loader-hud">
          <div className="loader-glitch" data-text="NEON STREET 3D">
            NEON STREET 3D
          </div>
          <div className="loader-sub">SYSTEM INITIALIZING // WEBGL 2.0</div>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="loader-meta">
            <span>LOADING ASSETS & SHADERS</span>
            <span className="loader-percent">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* ─── SCI-FI CORNER RETICLES ─── */}
      <div className="cyber-frame-corner top-left" aria-hidden="true" />
      <div className="cyber-frame-corner top-right" aria-hidden="true" />
      <div className="cyber-frame-corner bottom-left" aria-hidden="true" />
      <div className="cyber-frame-corner bottom-right" aria-hidden="true" />

      {/* ─── TOP HUD HEADER ─── */}
      <header className="cyber-hud-header">
        <div className="brand-group">
          <button className="brand-badge" onClick={() => p.onClose()} title="Về toàn cảnh phố">
            <span className="brand-glow-dot" />
            <span className="brand-title">THANHTRI.DEV</span>
            <span className="brand-tag">PORTFOLIO 3D</span>
          </button>
          <div className="brand-status">
            <span className="status-live">● ONLINE</span>
            <span className="status-divider">|</span>
            <span className="status-info">{p.time.toUpperCase()} · {p.weather.toUpperCase()}</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Tour Mode */}
          <button
            className={`cyber-btn tour-btn ${isTouring ? 'active' : ''}`}
            onClick={() => setIsTouring(!isTouring)}
            title="Tự động bay qua từng khu vực"
          >
            <span className="btn-icon">{isTouring ? '⏹' : '▶'}</span>
            <span className="btn-text">{isTouring ? 'DỪNG TOUR' : 'AUTO TOUR'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            className={`cyber-btn audio-btn ${p.sound ? 'active' : ''}`}
            onClick={p.toggleSound}
            title={p.sound ? 'Tắt âm thanh' : 'Bật âm thanh synth & mưa'}
          >
            <span className="eq-icon" aria-hidden="true">
              <i className={p.sound ? 'wave' : ''} />
              <i className={p.sound ? 'wave delay-1' : ''} />
              <i className={p.sound ? 'wave delay-2' : ''} />
            </span>
            <span className="btn-text">{p.sound ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
          </button>

          {/* Environment HUD Button */}
          <button
            className={`cyber-btn env-btn ${envOpen ? 'active' : ''}`}
            onClick={() => setEnvOpen(!envOpen)}
            aria-expanded={envOpen}
            title="Tuỳ chỉnh thời gian, thời tiết và đồ họa"
          >
            <span className="btn-icon">⚙</span>
            <span className="btn-text">CẢNH QUAN</span>
          </button>

          {/* Social Quick Links */}
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

      {/* ─── ENVIRONMENT CONTROL DRAWER ─── */}
      {envOpen && (
        <div className="cyber-modal-backdrop" onClick={() => setEnvOpen(false)}>
          <div className="cyber-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">
                <span className="accent-bar" />
                <span>ĐIỀU KHIỂN KHÔNG GIAN 3D</span>
              </div>
              <button className="drawer-close" onClick={() => setEnvOpen(false)}>✕</button>
            </div>

            <div className="drawer-body">
              {/* Thời gian */}
              <div className="control-section">
                <label className="control-label">
                  <span>THỜI GIAN TRONG NGÀY</span>
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
                      {t === 'sunset' && '🌇 '}
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
                      {w === 'fog' && '🌫️ '}
                      {w === 'clear' && '✨ '}
                      {WEATHER_LABELS[w]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Âm thanh & Đồ họa */}
              <div className="control-grid-two">
                <div className="control-section">
                  <label className="control-label"><span>ÂM THANH</span></label>
                  <button
                    className={`cyber-toggle-btn ${p.sound ? 'active' : ''}`}
                    onClick={p.toggleSound}
                  >
                    {p.sound ? '🔊 Đang bật' : '🔇 Đã tắt'}
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
              <span className="footer-hint">Tự động điều chỉnh hiệu năng theo FPS thiết bị</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── RETRO TV / DESK MODE OVERLAY ─── */}
      {current?.kind === 'music' && (
        <div className="cyber-banner-mode">
          <div className="banner-content">
            <span className="banner-badge">RETRO MUSIC TV</span>
            <span className="banner-text">Bấm vào màn hình TV trong phố để chuyển bài và chỉnh âm lượng</span>
          </div>
          <button className="cyber-btn highlight" onClick={p.onClose}>Thoát góc nhìn · ESC</button>
        </div>
      )}

      {current?.kind === 'desk' && (
        <div className="cyber-banner-mode">
          <div className="banner-content">
            <span className="banner-badge">DEV WORKSPACE</span>
            <span className="banner-text">Màn hình trái: Dự án · Giữa: Code · Phải: Chơi game Snake (WASD / Phím mũi tên)</span>
          </div>
          <button className="cyber-btn highlight" onClick={p.onClose}>Thoát góc nhìn · ESC</button>
        </div>
      )}

      {/* ─── CYBER CONTENT PANEL (HOLOGRAPHIC MODAL) ─── */}
      {current?.content && (
        <aside className="cyber-panel" key={current.id}>
          {/* Panel Top Decorative Bar */}
          <div className="panel-glow-line" />
          <div className="panel-hud-header">
            <div className="panel-module-tag">
              <span className="tag-bracket">[</span>
              <span className="tag-name">MODULE // {current.label.toUpperCase()}</span>
              <span className="tag-bracket">]</span>
            </div>
            <button className="panel-close-btn" onClick={p.onClose} title="Đóng panel (Esc)">✕</button>
          </div>

          <div className="panel-scroll-area">
            <h2 className="panel-title">{current.content.title}</h2>
            {current.content.body && <p className="panel-description">{current.content.body}</p>}

            {/* Tags / Badges */}
            {current.content.tags && (
              <div className="panel-tags-wrap">
                {current.content.tags.map((t) => (
                  <span key={t} className="cyber-tag">{t}</span>
                ))}
              </div>
            )}

            {/* Special Skills View */}
            {current.id === 'skills' && (
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
            )}

            {/* Standard Items (Projects, Experience, Blog) */}
            {current.id !== 'skills' && current.content.items && (
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

            {/* Quick Contact Buttons if on Contact */}
            {current.id === 'contact' && (
              <div className="contact-quick-box">
                <div className="email-display">
                  <span>{PROFILE.email}</span>
                  <button className="copy-btn" onClick={copyEmail}>
                    {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
                  </button>
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

      {/* ─── FLOATING CYBER SYNTH MINI PLAYER ─── */}
      {m.playing && current?.kind !== 'music' && (
        <div className="cyber-floating-player" role="group" aria-label="Cyber Player">
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
            <span className="track-artist">{TRACKS[m.index].artist}</span>
          </div>
          <div className="player-controls">
            <button className="ctrl-btn" onClick={() => music.prev()} title="Bài trước">⏮</button>
            <button className="ctrl-btn play-pause" onClick={() => music.pause()} title="Tạm dừng">❚❚</button>
            <button className="ctrl-btn" onClick={() => music.next()} title="Bài sau">⏭</button>
          </div>
        </div>
      )}

      {/* ─── BOTTOM FLOATING CYBER DOCK (NAVIGATION) ─── */}
      <nav className="cyber-bottom-dock" aria-label="Điều hướng nhanh">
        <button
          className={`dock-item overview ${!p.activeId ? 'active' : ''}`}
          onClick={() => p.onClose()}
          title="Toàn cảnh đường phố"
        >
          <span className="dock-icon">🌆</span>
          <span className="dock-label">Toàn cảnh</span>
        </button>

        <div className="dock-divider" />

        {NAV_SHORTCUTS.map((item) => {
          const isActive = p.activeId === item.id
          return (
            <button
              key={item.id}
              className={`dock-item ${isActive ? 'active' : ''}`}
              onClick={() => p.onSelect(item.id)}
              title={`Khám phá ${item.label}`}
            >
              <span className="dock-icon">{item.icon}</span>
              <span className="dock-label">{item.label}</span>
              {isActive && <span className="active-dot" />}
            </button>
          )
        })}
      </nav>

      {/* ─── INTERACTION HINT ─── */}
      {hint && !loading && !p.activeId && (
        <div className="cyber-hint-toast" aria-hidden="true">
          <span className="hint-pulse" />
          <span>Kéo chuột để xoay camera · Cuộn để phóng to · Bấm vào biển hiệu đèn neon để tương tác</span>
        </div>
      )}
    </>
  )
}
