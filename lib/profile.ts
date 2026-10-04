/**
 * =====================================================================
 *  NỘI DUNG PORTFOLIO  –  SỬA Ở ĐÂY (tên, email, link, dự án, kinh nghiệm)
 *  Các bảng hiệu trong lib/signs.ts đọc dữ liệu từ file này.
 * =====================================================================
 */
export type Item = { title: string; desc?: string; meta?: string; href?: string }

export const PROFILE = {
  name: 'Your Name',
  role: 'Full-stack Software Engineer',
  email: 'you@example.com',
  github: 'https://github.com/your-handle',
  linkedin: 'https://linkedin.com/in/your-handle',
  cv: '/cv.pdf',
  about:
    'Full-stack Software Engineer: xây web, mobile và hệ thống có tích hợp AI/LLM. Thích kiến trúc rõ ràng, giải pháp đơn giản và trải nghiệm người dùng gọn gàng.',
  skills: {
    Frontend: ['React', 'Next.js', 'TypeScript'],
    Backend: ['.NET / ASP.NET', 'Node.js', 'Entity Framework', 'Prisma'],
    Mobile: ['Flutter', 'React Native'],
    Data: ['PostgreSQL', 'SQL Server', 'Supabase'],
    'AI / Cloud': ['LLM integration', 'Python · Pandas · Scikit-learn', 'Docker', 'Vercel'],
  } as Record<string, string[]>,
  projects: [
    { title: 'Project One', desc: 'Web app full-stack với Next.js + PostgreSQL.', meta: 'Next.js · Prisma · Clerk', href: 'https://github.com/your-handle' },
    { title: 'Project Two', desc: 'Ứng dụng mobile đa nền tảng.', meta: 'Flutter · Supabase' },
    { title: 'Project Three', desc: 'Công cụ tích hợp LLM cho quy trình nội bộ.', meta: 'Python · LLM · Docker' },
  ] as Item[],
  experience: [
    { title: 'Software Engineer', meta: '2024 – nay', desc: 'Phát triển feature full-stack, thiết kế API và database.' },
    { title: 'Junior / Intern Developer', meta: '2023 – 2024', desc: 'Làm việc với .NET, React và SQL Server.' },
  ] as Item[],
  posts: [
    { title: 'Thiết kế API sạch với ASP.NET', meta: 'Architecture' },
    { title: 'Tối ưu Next.js: từ 3s xuống 1s', meta: 'Performance' },
    { title: 'Tích hợp LLM an toàn vào backend', meta: 'AI' },
  ] as Item[],
}
