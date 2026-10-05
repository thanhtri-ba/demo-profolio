'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { CAMERA_PRESETS, HOME_VIEW, INTRO_VIEW, type CameraPreset, type View } from '@/lib/signs'

/**
 * CameraRig thông minh:
 * - Tự động điều chỉnh góc nhìn theo tỉ lệ màn hình (responsive aspect ratio):
 *   trên màn hình hẹp (laptop 16:10, tablet, mobile dọc), camera tự lùi lại vừa khít toàn bộ thành phố.
 * - Hỗ trợ các góc quay preset: Toàn cảnh, Bao quát rộng, Isometric, Dạo phố, Trên cao.
 * - Lắng nghe sự kiện zoom in / zoom out / reset / đổi góc nhìn từ UI.
 */
export function CameraRig({
  view,
  preset = 'default',
}: {
  view: View | null
  preset?: CameraPreset
}) {
  const ref = useRef<CameraControlsImpl>(null)
  const first = useRef(true)
  const { size } = useThree()

  // Tỉ lệ khung hình màn hình web
  const aspect = size.width / Math.max(1, size.height)

  // Căn chỉnh khoảng cách camera tự động theo tỉ lệ màn hình
  const responsiveHome = useMemo(() => {
    const base = CAMERA_PRESETS[preset]?.view ?? HOME_VIEW
    // Chuẩn thiết kế gốc là màn hình ngang 16:9 (~1.777)
    const standardAspect = 16 / 9
    if (aspect >= standardAspect) return base

    // Nếu màn hình hẹp hơn (16:10, 4:3, dọc 9:16), lùi xa tỉ lệ thuận để không bao giờ bị cắt 2 bên
    const scale = Math.min(2.5, Math.max(1, (standardAspect / aspect) * 0.95))
    return {
      pos: [
        base.pos[0] * scale,
        base.pos[1] * Math.pow(scale, 0.72),
        base.pos[2] * scale,
      ] as [number, number, number],
      target: base.target,
    }
  }, [aspect, preset])

  // Chuyển góc nhìn camera
  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (first.current) {
      first.current = false
      c.setLookAt(...INTRO_VIEW.pos, ...INTRO_VIEW.target, false)
      const id = setTimeout(() => {
        const v0 = view ?? responsiveHome
        c.setLookAt(...v0.pos, ...v0.target, true)
      }, 150)
      return () => clearTimeout(id)
    }
    const v = view ?? responsiveHome
    c.setLookAt(...v.pos, ...v.target, true)
  }, [view, responsiveHome])

  // Lắng nghe sự kiện từ thanh công cụ UI (Zoom, Fit, Reset)
  useEffect(() => {
    const onZoomIn = () => ref.current?.dolly(-0.35, true)
    const onZoomOut = () => ref.current?.dolly(0.35, true)
    const onFitScreen = () => {
      const v = view ?? responsiveHome
      ref.current?.setLookAt(...v.pos, ...v.target, true)
    }

    window.addEventListener('neon-camera-zoom-in', onZoomIn)
    window.addEventListener('neon-camera-zoom-out', onZoomOut)
    window.addEventListener('neon-camera-fit', onFitScreen)
    return () => {
      window.removeEventListener('neon-camera-zoom-in', onZoomIn)
      window.removeEventListener('neon-camera-zoom-out', onZoomOut)
      window.removeEventListener('neon-camera-fit', onFitScreen)
    }
  }, [view, responsiveHome])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.12}
      minDistance={0.12}
      maxDistance={7.5}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}

