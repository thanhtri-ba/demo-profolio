'use client'
import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'

export const MODEL_URL = '/models/neon-street.glb' // 4096² WebP, ~1.06M tris, texture đã sharpen (~9MB)
export const MODEL_LITE_URL = '/models/neon-street-lite.glb' // 2048², ~0.6M tris (~4.7MB) cho mobile / máy yếu

/**
 * Model Tripo chỉ có 1 mesh với texture đã bake sẵn ánh sáng ban đêm,
 * nên dùng MeshBasicMaterial (unlit) và đổi "thời gian trong ngày" bằng màu nhân (tint).
 */
export function Street({ lite = false, reflect = true }: { lite?: boolean; reflect?: boolean }) {
  const { scene } = useGLTF(lite ? MODEL_LITE_URL : MODEL_URL) // meshopt + WebP được xử lý tự động
  const gl = useThree((s) => s.gl)
  const mats = useRef<THREE.MeshBasicMaterial[]>([])

  useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy()
    mats.current = []
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const old = mesh.material as THREE.MeshStandardMaterial
      if (old.map) old.map.anisotropy = aniso
      const m = new THREE.MeshBasicMaterial({ map: old.map, toneMapped: false })
      mesh.material = m
      mats.current.push(m)
    })
  }, [scene, gl])

  useFrame(() => {
    const f = live.flash * 0.7
    for (const m of mats.current) {
      m.color.copy(live.tint).multiplyScalar(live.dim)
      m.color.r += f
      m.color.g += f
      m.color.b += f
    }
  })

  // bóng đổ + phản chiếu: bản sao lật gương qua mặt phẳng y=0 (dùng chung geometry/material), phủ bằng đĩa đen mờ dần ra xa
  const mirror = useMemo(() => (reflect ? scene.clone() : null), [scene, reflect])
  const floorTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(0,0,0,0.72)')
    g.addColorStop(0.42, 'rgba(0,0,0,0.78)')
    g.addColorStop(0.75, 'rgba(0,0,0,0.97)')
    g.addColorStop(1, 'rgba(0,0,0,1)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    return t
  }, [])

  return (
    <>
      <primitive object={scene} />
      {mirror && <group scale={[1, -1, 1]}><primitive object={mirror} /></group>}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.0004} renderOrder={1}>
        <circleGeometry args={[1.35, 64]} />
        <meshBasicMaterial map={floorTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

