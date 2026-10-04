'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useProgress } from '@react-three/drei'
import type { Sign } from '@/lib/signs'
import { music, TRACKS } from '@/lib/music'
import { TIME_LABELS, WEATHER_LABELS, type TimeOfDay, type Weather } from '@/lib/mood'

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

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: Record<T, string>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {(Object.keys(options) as T[]).map((k) => (
        <button key={k} className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>
          {options[k]}
        </button>
      ))}
    </div>
  )
}

function useMusic() {
  return useSyncExternalStore(music.subscribe, music.getSnapshot, music.getSnapshot)
}

function ModeBack({ onClose, text }: { onClose: () => void; text: string }) {
  return (
    <div className="mini back" role="group" aria-label="Điều khiển TV">
      <span className="hint-inline">{text}</span>
      <button className="wide" onClick={onClose}>Quay lại · Esc</button>
    </div>
  )
}

function MiniPlayer() {
  const m = useMusic()
  if (!m.playing) return null
  return (
    <div className="mini" role="group" aria-label="Đang phát">
      <span className="eq" aria-hidden="true"><i /><i /><i /></span>
      <strong>{TRACKS[m.index].title}</strong>
      <button aria-label="Bài sau" onClick={() => music.next()}>⏭</button>
      <button aria-label="Tạm dừng" onClick={() => music.pause()}>❚❚</button>
    </div>
  )
}

export function Overlay(p: Props) {
  const { progress, active: loading } = useProgress()
  const current = p.signs.find((s) => s.id === p.activeId)
  const [panelOpen, setPanelOpen] = useState(true)
  const [hint, setHint] = useState(true)
  const [coarse, setCoarse] = useState(false)

  // mobile: thu gọn bảng điều khiển; gợi ý biến mất sau lần tương tác đầu
  useEffect(() => {
    if (matchMedia('(max-width: 720px)').matches) setPanelOpen(false)
    setCoarse(matchMedia('(pointer: coarse)').matches)
    const hide = () => setHint(false)
    const t = setTimeout(hide, 9000)
    addEventListener('pointerdown', hide, { once: true })
    return () => { clearTimeout(t); removeEventListener('pointerdown', hide) }
  }, [])

  return (
    <>
      <div className={`loader ${loading ? '' : 'done'}`}>
        <div className="loader-bar"><span style={{ width: `${progress}%` }} /></div>
        <p>Đang tải… {Math.round(progress)}%</p>
      </div>

      <header className="brand">NEON&nbsp;STREET</header>

      <div className="scene-ctl">
        <button className="ctl-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
          Cảnh {panelOpen ? '–' : '+'}
        </button>
        {panelOpen && !current?.kind && (
          <div className="ctl-panel">
            <div className="ctl-row"><span>Thời gian</span><Seg label="Thời gian" value={p.time} options={TIME_LABELS} onChange={p.setTime} /></div>
            <div className="ctl-row"><span>Thời tiết</span><Seg label="Thời tiết" value={p.weather} options={WEATHER_LABELS} onChange={p.setWeather} /></div>
            <div className="ctl-row">
              <span>Âm thanh</span>
              <div className="seg"><button className={p.sound ? 'on' : ''} aria-pressed={p.sound} onClick={p.toggleSound}>{p.sound ? 'Đang bật' : 'Tắt'}</button></div>
            </div>
            <div className="ctl-row">
              <span>Chất lượng</span>
              <Seg label="Chất lượng" value={p.quality} options={{ high: 'Cao', low: 'Thấp' }} onChange={p.setQuality} />
            </div>
          </div>
        )}
      </div>

      {current?.kind === 'music' && <ModeBack onClose={p.onClose} text="Bấm vào màn hình TV để phát, đổi bài, chỉnh âm lượng" />}
      {current?.kind === 'desk' && <ModeBack onClose={p.onClose} text="Trái: dự án · Giữa: code · Phải: chơi Neon Snake (← ↑ ↓ → / WASD)" />}
      {current?.kind !== 'music' && current?.kind !== 'desk' && <MiniPlayer />}

      {current?.content && (
        <aside className="panel" key={current.id}>
          <h2>{current.content.title}</h2>
          {current.content.body && <p>{current.content.body}</p>}
          {current.content.tags && (
            <ul className="tags">{current.content.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          )}
          {current.content.items && (
            <ul className="items">
              {current.content.items.map((it) => (
                <li key={it.title}>
                  <div className="it-head"><strong>{it.href ? <a href={it.href} target="_blank" rel="noreferrer">{it.title}</a> : it.title}</strong>{it.meta && <em>{it.meta}</em>}</div>
                  {it.desc && <span>{it.desc}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="panel-actions">
            {current.content.cta && <a href={current.content.cta.href} className="cta">{current.content.cta.label}</a>}
            <button onClick={p.onClose}>Quay lại · Esc</button>
          </div>
        </aside>
      )}

      {hint && !loading && !p.activeId && (
        <div className="hint" aria-hidden="true">{coarse ? 'Chạm kéo để xoay · Chụm để zoom · Chạm vào bảng hiệu' : 'Kéo để xoay · Cuộn để zoom · Bấm vào bảng hiệu · ← → chuyển bảng'}</div>
      )}

    </>
  )
}
