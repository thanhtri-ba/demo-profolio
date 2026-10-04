'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '@/lib/mood'

const WHITE = new THREE.Color(1, 1, 1)

/** Bầu trời gradient + sao. Đổi màu theo thời gian trong ngày. */
export function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const starMat = useRef<THREE.PointsMaterial>(null)
  const stars = useRef<THREE.Points>(null)

  const uniforms = useMemo(() => ({ top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } }), [])
  const starGeo = useMemo(() => {
    const N = 450
    const p = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2
      const y = 0.12 + Math.random() * 0.88 // nửa trên bầu trời
      const r = Math.sqrt(1 - y * y)
      p.set([Math.cos(u) * r * 15, y * 15, Math.sin(u) * r * 15], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    uniforms.top.value.copy(live.top).lerp(WHITE, live.flash * 0.5)
    uniforms.bottom.value.copy(live.bottom).lerp(WHITE, live.flash * 0.7)
    if (starMat.current) {
      starMat.current.opacity = live.stars * (1 - Math.min(1, live.fog * 1.6)) * (1 - live.flash)
      starMat.current.visible = starMat.current.opacity > 0.01
    }
    if (stars.current) stars.current.rotation.y += dt * 0.004
  })

  return (
    <>
      <mesh renderOrder={-10}>
        <sphereGeometry args={[16, 32, 16]} />
        <shaderMaterial
          ref={mat}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={`varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
            void main(){ float t = smoothstep(-0.3, 0.55, vPos.y); gl_FragColor = vec4(mix(bottom, top, t), 1.0);
            #include <colorspace_fragment>
            }`}
        />
      </mesh>
      <points ref={stars} geometry={starGeo} renderOrder={-9}>
        <pointsMaterial ref={starMat} color="#ffffff" size={0.028} sizeAttenuation transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  )
}
