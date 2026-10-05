import * as THREE from 'three'

/**
 * Trạng thái "tâm trạng" của cảnh: thời gian + thời tiết.
 * Các giá trị trong `live` được MoodDriver nội suy mượt mỗi frame,
 * các component khác (Sky, Street, Signs, Rain, Effects...) chỉ việc đọc.
 */
export type TimeOfDay = 'night' | 'dusk' | 'day'
export type Weather = 'clear' | 'rain' | 'fog' | 'storm' | 'snow'

export const TIME_LABELS: Record<TimeOfDay, string> = { night: 'Đêm', dusk: 'Hoàng hôn', day: 'Ngày' }
export const WEATHER_LABELS: Record<Weather, string> = { clear: 'Quang', rain: 'Mưa', fog: 'Sương', storm: 'Bão', snow: 'Tuyết' }

type TimePreset = {
  top: string          // màu đỉnh trời
  bottom: string       // màu chân trời
  tint: [number, number, number] // nhân vào texture phố (đã bake ánh sáng ban đêm)
  neon: number         // độ sáng neon (bảng hiệu)
  bloom: number
  stars: number        // 0..1, cũng dùng cho chùm đèn pha
  fog: string
  vignette: number
}

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  night: { top: '#000000', bottom: '#050507', tint: [1, 1, 1], neon: 1, bloom: 0.85, stars: 0.5, fog: '#050507', vignette: 0.5 },
  dusk: { top: '#2b2760', bottom: '#ff8f66', tint: [1.3, 1.02, 0.9], neon: 0.8, bloom: 0.65, stars: 0.2, fog: '#7a4f66', vignette: 0.4 },
  day: { top: '#4a90e2', bottom: '#dff1ff', tint: [1.85, 1.8, 1.75], neon: 0.4, bloom: 0.25, stars: 0, fog: '#b9d4ea', vignette: 0.22 },
}

type WeatherPreset = { rain: number; snow: number; fog: number; lightning: boolean; dim: number }
export const WEATHER_PRESETS: Record<Weather, WeatherPreset> = {
  clear: { rain: 0, snow: 0, fog: 0, lightning: false, dim: 1 },
  rain: { rain: 0.6, snow: 0, fog: 0.12, lightning: false, dim: 0.92 },
  fog: { rain: 0, snow: 0, fog: 0.38, lightning: false, dim: 0.95 },
  storm: { rain: 1, snow: 0, fog: 0.2, lightning: true, dim: 0.78 },
  snow: { rain: 0, snow: 1, fog: 0.16, lightning: false, dim: 0.96 },
}

const n = TIME_PRESETS.night
export const live = {
  top: new THREE.Color(n.top),
  bottom: new THREE.Color(n.bottom),
  tint: new THREE.Color(n.tint[0], n.tint[1], n.tint[2]),
  fogColor: new THREE.Color(n.fog),
  fog: WEATHER_PRESETS.rain.fog,
  neon: n.neon,
  bloom: n.bloom,
  stars: n.stars,
  vignette: n.vignette,
  rain: WEATHER_PRESETS.rain.rain,
  snow: 0, // 0..1: lượng tuyết rơi + độ phủ tuyết trên mái
  dim: WEATHER_PRESETS.rain.dim,
  flash: 0, // chớp sét 0..1
}
