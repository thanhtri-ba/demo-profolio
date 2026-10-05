'use client'
import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'

const snowUniform = { value: 0 }

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
          side: isMirror ? THREE.DoubleSide : THREE.FrontSide,
        })
        m.onBeforeCompile = (sh) => {
          sh.uniforms.uSnow = snowUniform
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSnowN;\nvarying vec3 vSnowP;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSnowN = normal;\nvSnowP = position;')
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vSnowN;
varying vec3 vSnowP;
uniform float uSnow;
float snHash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float snNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(snHash(i), snHash(i+vec3(1,0,0)), f.x), mix(snHash(i+vec3(0,1,0)), snHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(snHash(i+vec3(0,0,1)), snHash(i+vec3(1,0,1)), f.x), mix(snHash(i+vec3(0,1,1)), snHash(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
            .replace('#include <map_fragment>', `#include <map_fragment>
{
  float up = normalize(vSnowN).y;
  float n = snNoise(vSnowP * 90.0) * 0.6 + snNoise(vSnowP * 260.0) * 0.4;
  float cover = smoothstep(0.55, 0.8, up + (n - 0.5) * 0.35) * uSnow;
  vec3 snowCol = vec3(0.86, 0.92, 1.0) * (0.9 + 0.2 * n) * diffuse;
  diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, cover * 0.92);
}`)
        }
        mesh.material = m
        mats.current.push(m)
      })
    }

    processHierarchy(scene, false)
    if (mirror) processHierarchy(mirror, true)
  }, [scene, mirror, gl])

  useFrame(() => {
    snowUniform.value = live.snow
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
    // Tâm đĩa trong suốt vừa phải để thấy rõ nét bóng phản chiếu của toà nhà và bảng neon
    g.addColorStop(0, 'rgba(3, 5, 10, 0.28)')
    g.addColorStop(0.35, 'rgba(3, 5, 10, 0.42)')
    g.addColorStop(0.65, 'rgba(2, 4, 8, 0.72)')
    g.addColorStop(0.85, 'rgba(1, 2, 4, 0.92)')
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

      {/* ─── BẢN SAO LẬT NGƯỢC TẠO BÓNG PHẢN CHIẾU MẶT NƯỚC ƯỚT ─── */}
      {mirror && (
        <group scale={[1, -1, 1]} position-y={-0.0004}>
          <primitive object={mirror} />
        </group>
      )}

      {/* ─── ĐĨA PHỦ MỜ DẦN MẶT ĐƯỜNG ƯỚT TẠO ĐỘ SÂU VÀ ĐỘ BÓNG NƯỚC ─── */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.0002} renderOrder={10}>
        <circleGeometry args={[1.45, 64]} />
        <meshBasicMaterial map={floorTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}
