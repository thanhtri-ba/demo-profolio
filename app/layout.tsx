import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Phạm Thành Trí — 3D Cyberpunk Portfolio',
  description: 'Không gian 3D tương tác đường phố Cyberpunk khám phá Portfolio, kỹ năng, dự án và kinh nghiệm của Phạm Thành Trí (thanhtri-ba).',
  keywords: ['Phạm Thành Trí', 'thanhtri-ba', '3D Portfolio', 'Next.js', 'React Three Fiber', 'Three.js', 'Cyberpunk Web'],
  authors: [{ name: 'Phạm Thành Trí', url: 'https://github.com/thanhtri-ba' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

