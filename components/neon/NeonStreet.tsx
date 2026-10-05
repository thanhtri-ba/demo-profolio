'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { SIGNS, viewForSign, type CameraPreset } from '@/lib/signs'
import { live, type TimeOfDay, type Weather } from '@/lib/mood'
import { engine } from '@/lib/audio'
import { Street } from './Street'
import { Signs } from './Signs'
import { Rain } from './Rain'
import { Dust } from './Dust'
import { Snow } from './Snow'
import { Sky } from './Sky'
import { MoodDriver } from './MoodDriver'
import { Drones } from './Drones'
import { Searchlight } from './Searchlight'
import { Steam } from './Steam'
import { MusicZone } from './MusicZone'
import { TVPlayer } from './TVPlayer'
import { Desk } from './Desk'
import { PCSetup } from './PCSetup'
import { music } from '@/lib/music'
import { LightPools } from './LightPools'
import { Effects } from './Effects'
import { CameraRig } from './CameraRig'
import { Overlay } from './Overlay'

// Toạ độ đo trực tiếp trên model: mặt đường (hơi nước) và đỉnh cột đèn cao nhất (đèn pha).
const STEAM_SOURCES: [number, number, number][] = [
  [-0.03, 0.014, 0.191],
  [-0.3, 0.014, -0.121],
  [-0.012, 0.014, 0.392],
]
// vệt sáng + gợn nước nằm trên mặt đường (toạ độ x, z, màu neon gần đó)
const POOLS: [number, number, string][] = [
  [-0.03, 0.191, '#ff4fd8'],
  [-0.3, -0.121, '#19e3f5'],
  [-0.012, 0.392, '#ffc233'],
]
// khu nghe nhạc: giữa đoạn đường phía bên trái (đo từ ảnh nhìn từ trên xuống)
const MUSIC_POS: [number, number, number] = [-0.31, 0.014, -0.1]
// TV phát nhạc: góc mới trong khoảng đen bên trái phố, quay mặt về phía phố
const TV_POS: [number, number, number] = [-1.2, 0.255, -0.25]
const TV_YAW = 0.95
// bàn máy tính ở góc đen bên phải (mặt bàn cao 0.4 so với sàn) + PC mini trên đường làm cổng vào
const DESK_POS: [number, number, number] = [2.9, 0.4, -0.6]
const DESK_YAW = -1.0
const PC_POS: [number, number, number] = [-0.035, 0.014, 0.29]
const PC_YAW = -0.6
const MAST_TOP: [number, number, number] = [-0.445, 0.652, 0.448]

const NAV_IDS = SIGNS.filter((s) => s.nav).map((s) => s.id)

export default function NeonStreet() {
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default')
  const [time, setTime] = useState<TimeOfDay>('night')
  const [weather, setWeather] = useState<Weather>('snow')
  const [sound, setSound] = useState(false)
  const [quality, setQuality] = useState<'high' | 'low'>('high')
  const [forced, setForced] = useState(false)
  const [lite, setLite] = useState<boolean | null>(null) // null = chưa quyết định model nào (tránh tải cả 2)
  const [dpr, setDpr] = useState(1.5)

  const active = useMemo(() => SIGNS.find((s) => s.id === activeId) ?? null, [activeId])
  const view = useMemo(() => (active ? viewForSign(active) : null), [active])

  // chọn bảng + đồng bộ #hash để có thể chia sẻ link sâu (#about, #projects...)
  const setActive = useCallback((id: string | null) => {
    setActiveIdState(id)
    try { history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search) } catch { /* sandbox */ }
  }, [])

  const userSetActive = setActive

  const onSelect = useCallback((id: string) => {
    const s = SIGNS.find((x) => x.id === id)
    if (!s) return
    if (s.kind === 'music' && !music.playing) void music.play()
    engine.blip(s.hotspot || s.icon ? 660 : 880)
    if ((s.hotspot || s.icon) && s.href) window.open(s.href, '_blank', 'noopener')
    else setActive(id)
  }, [setActive])

  const toggleSound = useCallback(() => {
    if (sound) { engine.setMuted(true); setSound(false) }
    else { engine.start(); setSound(true) }
  }, [sound])

  // mưa nghe to/nhỏ theo lượng mưa hiện tại
  useEffect(() => {
    if (!sound) return
    const id = setInterval(() => engine.setRain(live.rain), 250)
    return () => clearInterval(id)
  }, [sound])

  // phím: Esc về toàn cảnh, ←/→ chuyển bảng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /INPUT|TEXTAREA/.test(t.tagName)) return
      if (e.key === 'Escape') userSetActive(null)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const list = [null, ...NAV_IDS]
        const i = list.indexOf(activeId)
        const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]
        userSetActive(next)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [activeId, userSetActive])

  // khởi tạo: link sâu #id, mobile -> chất lượng thấp, ép bằng ?quality=
  useEffect(() => {
    const h = location.hash.replace('#', '')
    if (h && SIGNS.some((s) => s.id === h && !s.icon && !s.hotspot)) setActiveIdState(h)
    const q = new URLSearchParams(location.search).get('quality')
    const coarse = matchMedia('(pointer: coarse)').matches
    if (q === 'high' || q === 'low') { setQuality(q); setForced(true) }
    else if (coarse) setQuality('low')
    setLite(q === 'low' || (q !== 'high' && coarse))
  }, [])

  const high = quality === 'high'

  return (
    <div className="stage">
      <Canvas
        flat
        dpr={high ? dpr : 1}
        camera={{ fov: 35, near: 0.01, far: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => userSetActive(null)}
      >
        <color attach="background" args={['#000000']} />
        {!forced && <PerformanceMonitor bounds={() => [40, 58]} onDecline={() => setQuality('low')} onChange={({ factor }) => setDpr(1 + factor)} />}
        <Sky />
        <MoodDriver time={time} weather={weather} onThunder={() => engine.thunder()} />
        <Suspense fallback={null}>
          {lite !== null && <Street lite={lite} reflect={true} />}
          <Signs signs={SIGNS} activeId={activeId} onSelect={onSelect} />
          <MusicZone position={MUSIC_POS} onSelect={() => onSelect('music')} />
          <TVPlayer position={TV_POS} yaw={TV_YAW} active={activeId === 'music'} onActivate={() => onSelect('music')} />
          <Desk position={DESK_POS} yaw={DESK_YAW} active={activeId === 'desk'} onActivate={() => onSelect('desk')} />
          <PCSetup position={PC_POS} yaw={PC_YAW} onSelect={() => onSelect('desk')} />
          <LightPools sources={POOLS} />
          {high && (
            <>
              <Dust />
              <Drones />
              <Steam sources={STEAM_SOURCES} />
              <Searchlight position={MAST_TOP} />
            </>
          )}
          <Rain max={high ? 1 : 0.45} />
          <Snow count={high ? 2200 : 800} size={0.024} />
          {high && <Snow count={300} size={0.05} />}
        </Suspense>
        <CameraRig view={view} preset={cameraPreset} />
        <Effects quality={quality} />
      </Canvas>

      <Overlay
        signs={SIGNS}
        activeId={activeId}
        onSelect={onSelect}
        onClose={() => userSetActive(null)}
        time={time}
        setTime={setTime}
        weather={weather}
        setWeather={setWeather}
        sound={sound}
        toggleSound={toggleSound}
        quality={quality}
        setQuality={setQuality}
        cameraPreset={cameraPreset}
        setCameraPreset={setCameraPreset}
      />
    </div>
  )
}
