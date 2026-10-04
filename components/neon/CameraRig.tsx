'use client'
import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { HOME_VIEW, INTRO_VIEW, type View } from '@/lib/signs'

/**
 * - Intro: bay từ xa vào HOME_VIEW
 * - view đổi (bấm bảng / nút) -> camera bay mượt tới view mới
 */
export function CameraRig({ view }: { view: View | null }) {
  const ref = useRef<CameraControlsImpl>(null)
  const first = useRef(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (first.current) {
      first.current = false
      c.setLookAt(...INTRO_VIEW.pos, ...INTRO_VIEW.target, false)
      const id = setTimeout(() => { const v0 = view ?? HOME_VIEW; c.setLookAt(...v0.pos, ...v0.target, true) }, 150)
      return () => clearTimeout(id)
    }
    const v = view ?? HOME_VIEW
    c.setLookAt(...v.pos, ...v.target, true)
  }, [view])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.12}
      minDistance={0.22}
      maxDistance={3}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}
