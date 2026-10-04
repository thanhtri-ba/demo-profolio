'use client'
import dynamic from 'next/dynamic'

// WebGL chỉ chạy ở client
const NeonStreet = dynamic(() => import('@/components/neon/NeonStreet'), { ssr: false })

export default function Page() {
  return <NeonStreet />
}
