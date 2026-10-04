'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { beamTexture } from '@/lib/textures'
import { live } from '@/lib/mood'

/** Đèn pha quét trời đặt trên đỉnh cột đèn (xoay chậm, chỉ rõ khi trời tối). */
export function Searchlight({ position, speed = 0.45, tilt = 0.8, color = '#bff3ff' }: { position: [number, number, number]; speed?: number; tilt?: number; color?: string }) {
  const spin = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => beamTexture(), [])
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.1, 1.5, 32, 1, true)
    g.translate(0, -0.75, 0) // đỉnh nón về gốc
    g.rotateX(Math.PI)       // thân nón hướng lên
    return g
  }, [])

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * speed
    if (mat.current) {
      const night = Math.min(1, live.stars + live.flash * 0)
      mat.current.opacity = 0.42 * night * (1 - Math.min(0.8, live.fog * 1.2))
      mat.current.visible = mat.current.opacity > 0.01
    }
  })

  return (
    <group position={position}>
      <group ref={spin}>
        <group rotation={[tilt, 0, 0]}>
          <mesh geometry={geo} raycast={() => null}>
            <meshBasicMaterial ref={mat} map={tex} color={color} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
