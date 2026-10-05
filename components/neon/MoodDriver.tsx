'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live, TIME_PRESETS, WEATHER_PRESETS, type TimeOfDay, type Weather } from '@/lib/mood'

const tmp = new THREE.Color()
const WHITE = new THREE.Color(1, 1, 1)

/** Nội suy mượt trạng thái thời gian/thời tiết, quản lý sương mù và sét. */
export function MoodDriver({ time, weather, onThunder }: { time: TimeOfDay; weather: Weather; onThunder?: () => void }) {
  const scene = useThree((s) => s.scene)
  const nextBolt = useRef(3)
  const cb = useRef(onThunder)
  cb.current = onThunder

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#000000', live.fog)
    return () => { scene.fog = null }
  }, [scene])

  useFrame((_, dt) => {
    const t = TIME_PRESETS[time]
    const w = WEATHER_PRESETS[weather]
    const k = 1 - Math.exp(-dt * 2.2)

    live.top.lerp(tmp.set(t.top), k)
    live.bottom.lerp(tmp.set(t.bottom), k)
    live.fogColor.lerp(tmp.set(t.fog), k)
    live.tint.r += (t.tint[0] - live.tint.r) * k
    live.tint.g += (t.tint[1] - live.tint.g) * k
    live.tint.b += (t.tint[2] - live.tint.b) * k
    live.neon += (t.neon - live.neon) * k
    live.bloom += (t.bloom - live.bloom) * k
    live.stars += (t.stars - live.stars) * k
    live.vignette += (t.vignette - live.vignette) * k
    live.rain += (w.rain - live.rain) * k
    live.snow += (w.snow - live.snow) * (1 - Math.exp(-dt * 0.8)) // tuyết phủ dần dần
    live.fog += (w.fog - live.fog) * k
    live.dim += (w.dim - live.dim) * k

    if (w.lightning) {
      nextBolt.current -= dt
      if (nextBolt.current <= 0) {
        live.flash = 1
        nextBolt.current = 4 + Math.random() * 7
        setTimeout(() => { live.flash = 1 }, 130) // nháy lần hai
        setTimeout(() => cb.current?.(), 400 + Math.random() * 1200)
      }
    }
    live.flash = Math.max(0, live.flash - dt * 3.5)

    const fog = scene.fog as THREE.FogExp2 | null
    if (fog) {
      fog.color.copy(live.fogColor).lerp(WHITE, live.flash * 0.6)
      fog.density = live.fog
    }
  })
  return null
}
