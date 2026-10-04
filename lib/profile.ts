/**
 * =====================================================================
 *  NỘI DUNG PORTFOLIO  –  PHẠM THÀNH TRÍ (thanhtri-ba)
 * =====================================================================
 */
export type Item = { title: string; desc?: string; meta?: string; href?: string }

export const PROFILE = {
  name: 'Phạm Thành Trí',
  tagline: 'Creative Full-Stack & 3D Web Developer',
  role: 'Software Engineer · 3D Web & Full-Stack Creative',
  email: 'phamthanhtri14032006@gmail.com',
  github: 'https://github.com/thanhtri-ba',
  linkedin: 'https://linkedin.com/in/thanhtri-ba',
  cv: '/cv.pdf',
  about:
    'Xin chào, tôi là Thành Trí! Một Software Engineer đam mê kiến tạo trải nghiệm web thế hệ mới kết hợp đồ họa 3D (WebGL, Three.js, React Three Fiber), kiến trúc Full-stack hiện đại và tích hợp AI. Tôi luôn chú trọng vào hiệu năng mượt mà, thiết kế Cyberpunk/Futuristic sắc nét và mã nguồn sạch sẽ.',
  skills: {
    '3D & Graphics': ['React Three Fiber', 'Three.js / WebGL', 'GLSL Shaders', 'Post-processing', 'Blender basics'],
    'Frontend': ['React 19', 'Next.js 16 (App Router)', 'TypeScript', 'TailwindCSS', 'Framer Motion'],
    'Backend & API': ['Node.js', 'ASP.NET Core', 'Express / NestJS', 'REST & GraphQL', 'WebSockets'],
    'Database & Cloud': ['PostgreSQL', 'Prisma ORM', 'Supabase', 'Docker', 'Vercel / Cloudflare'],
    'AI & Automation': ['LLM Integration', 'OpenAI / Claude API', 'LangChain', 'Python Automation'],
  } as Record<string, string[]>,
  projects: [
    {
      title: 'Neon Street 3D Portfolio',
      desc: 'Không gian đường phố 3D Cyberpunk tương tác thời gian thực với hệ thống thời tiết, chu kỳ ngày/đêm, âm thanh procedural synthwave và các bảng hiệu tương tác.',
      meta: 'Next.js 16 · React Three Fiber · WebAudio · Turbopack',
      href: 'https://github.com/thanhtri-ba/demo-profolio',
    },
    {
      title: 'Interactive 3D Space Portfolio',
      desc: 'Portfolio 3D không gian tương tác với chuyển động camera mượt mà, hiệu ứng ánh sáng động và tối ưu hóa hiệu năng trên mọi thiết bị di động.',
      meta: 'React · Three.js · GSAP · WebGL',
      href: 'https://github.com/thanhtri-ba',
    },
    {
      title: 'Modern Full-Stack SaaS Hub',
      desc: 'Nền tảng quản lý dự án & dữ liệu đám mây tích hợp xác thực đa phương thức, thanh toán tự động và dashboard phân tích dữ liệu thời gian thực.',
      meta: 'Next.js · Prisma · PostgreSQL · TailwindCSS',
      href: 'https://github.com/thanhtri-ba',
    },
    {
      title: 'AI Workflow & Assistant Bot',
      desc: 'Hệ thống tự động hóa tác vụ và tóm tắt thông tin thông minh sử dụng các mô hình ngôn ngữ lớn (LLM), hỗ trợ streaming phản hồi và phân tích văn bản.',
      meta: 'Python · FastAPI · LangChain · OpenAI',
      href: 'https://github.com/thanhtri-ba',
    },
  ] as Item[],
  experience: [
    {
      title: 'Creative Web & Software Engineer',
      meta: '2024 – Hiện tại',
      desc: 'Nghiên cứu & phát triển ứng dụng Web 3D tương tác, tối ưu hóa pipeline dựng hình WebGL và kiến trúc hệ thống Full-stack.',
    },
    {
      title: 'Full-Stack Developer (Dự án & Freelance)',
      meta: '2023 – 2024',
      desc: 'Xây dựng website, UI/UX hiện đại, tích hợp database và API bên thứ ba cho nhiều khách hàng và đối tác.',
    },
  ] as Item[],
  posts: [
    { title: 'Tối ưu hoá hiệu năng mô hình 3D trên WebGL & Next.js', meta: 'Graphics & Performance' },
    { title: 'Kỹ thuật tạo âm thanh Synthwave procedural bằng Web Audio API', meta: 'Creative Audio' },
    { title: 'Tích hợp AI & LLM vào quy trình phát triển sản phẩm hiện đại', meta: 'AI Engineering' },
  ] as Item[],
}

