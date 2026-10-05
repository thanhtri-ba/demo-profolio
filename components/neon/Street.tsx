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
 * Kèm nền bóng nước phản chiếu (Glossy wet mirror floor) bên dưới toàn bộ thành phố.
 */
export function Street({ lite = false, reflect = true }: { lite?: boolean; reflect?: boolean }) {
  const { scene } = useGLTF(lite ? MODEL_LITE_URL : MODEL_URL)
  const gl = useThree((s) => s.gl)
  const mats = useRef<THREE.MeshBasicMaterial[]>([])

  // Bản sao lật ngược phản chiếu qua mặt sàn y = 0
  const mirror = useMemo(() => (reflect ? scene.clone() : null), [scene, reflect])

  useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy()
    mats.current = []

    const processHierarchy = (obj: THREE.Object3D, isMirror = false) => {
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const old = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
        const map = 'map' in old ? old.map : null
        if (map) map.anisotropy = aniso
        const m = new THREE.MeshBasicMaterial({
          map,
          toneMapped: false,
          transparent: isMirror,
          opacity: isMirror ? 0.85 : 1,
        })
        mesh.material = m
        mats.current.push(m)
      })
    }

    processHierarchy(scene, false)
    if (mirror) processHierarchy(mirror, true)
  }, [scene, mirror, gl])

  useFrame(() => {
    const f = live.flash * 0.7
    for (const m of mats.current) {
      m.color.copy(live.tint).multiplyScalar(live.dim)
      m.color.r += f
      m.color.g += f
      m.color.b += f
    }
  })

  // Đĩa nền bóng nước: tạo cảm giác mặt đường ướt phản chiếu ánh đèn neon
  const floorTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(256, 256, 0, 256, 256, 256)
    // Tâm đĩa trong suốt vừa phải để thấy rõ bóng phản chiếu của toà nhà và bảng neon
    g.addColorStop(0, 'rgba(4, 7, 14, 0.38)')
    g.addColorStop(0.35, 'rgba(4, 7, 14, 0.52)')
    g.addColorStop(0.65, 'rgba(3, 5, 10, 0.76)')
    g.addColorStop(0.85, 'rgba(2, 3, 7, 0.94)')
    g.addColorStop(1, 'rgba(0, 0, 0, 1.0)')
    x.fillStyle = g
    x.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(c)
    return t
  }, [])

  return (
    <>
      {/* ─── THÀNH PHỐ CHÍNH ─── */}
      <primitive object={scene} />

      {/* ─── MẶT PHẲNG NỀN ĐƯỜNG NHỰA ĐEN BÓNG BÊN DƯỚI TOÀN BỘ PHỐ ─── */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.0006} renderOrder={0}>
        <circleGeometry args={[2.5, 64]} />
        <meshBasicMaterial color="#03050a" toneMapped={false} />
      </mesh>

      {/* ─── BẢN SAO LẬT NGƯỢC TẠO BÓNG PHẢN CHIẾU MẶT NƯỚC ƯỚT ─── */}
      {mirror && (
        <group scale={[1, -1, 1]}>
          <primitive object={mirror} />
        </group>
      )}

      {/* ─── ĐĨA PHỦ MỜ DẦN MẶT ĐƯỜNG ƯỚT TẠO ĐỘ SÂU VÀ ĐỘ BÓNG NƯỚC ─── */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.0002} renderOrder={2}>
        <circleGeometry args={[2.2, 64]} />
        <meshBasicMaterial map={floorTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}
