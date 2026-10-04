'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import type { BloomEffect, VignetteEffect } from 'postprocessing'
import { live } from '@/lib/mood'

/** high: Bloom + Vignette + SMAA  |  low: chỉ SMAA (máy yếu / mobile) */
export function Effects({ quality }: { quality: 'high' | 'low' }) {
  const bloom = useRef<BloomEffect>(null)
  const vig = useRef<VignetteEffect>(null)

  useFrame(() => {
    if (bloom.current) bloom.current.intensity = live.bloom * (1 + live.flash * 2.5)
    if (vig.current) vig.current.darkness = live.vignette
  })

  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <SMAA />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom ref={bloom} intensity={0.85} luminanceThreshold={0.9} luminanceSmoothing={0.25} mipmapBlur radius={0.75} />
      <Vignette ref={vig} offset={0.3} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  )
}
