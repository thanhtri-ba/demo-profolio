/**
 * =====================================================================
 *  CẤU HÌNH BẢNG HIỆU + ĐIỀU HƯỚNG  –  SỬA Ở ĐÂY
 * =====================================================================
 *  text     : chữ trên bảng (\n = xuống dòng)
 *  pos/yaw  : vị trí 3D + góc xoay Y của tấm phủ (đã đo sẵn trên model)
 *  size     : [rộng, cao] tấm phủ
 *  bg/color/glow : màu nền / chữ / vầng sáng
 *  flicker  : 0..1, độ chập chờn của neon (0 = không chập chờn)
 *  hotspot  : true = chỉ là vùng bấm (không phủ tấm chữ)
 *  nav      : true = hiện trong thanh điều hướng phía dưới
 *  content  : nội dung panel hiện ra khi camera bay tới bảng
 *  href     : link mở trực tiếp khi bấm (dùng cho icon)
 */
import { PROFILE as P } from './profile'
import type { Item } from './profile'

export type Vec3 = [number, number, number]

export type Sign = {
  id: string
  label: string
  text?: string
  pos: Vec3
  yaw: number
  size: [number, number]
  bg?: string
  color?: string
  glow?: string
  flicker?: number
  /** dòng phụ nhỏ bên dưới chữ chính (chỉ hiện khi bảng đủ cao) */
  sub?: string
  /** 'box' = hộp đèn có khung kim loại + viền neon nổi 3D (mặc định) | 'inset' = chỉ phủ lên khung có sẵn của model */
  style?: 'box' | 'inset'
  hotspot?: boolean
  /** icon 3D (tấm bo góc, 2 mặt) vẽ nét bằng canvas; icon mờ gốc của model đã được cắt bỏ khỏi file GLB */
  icon?: 'youtube' | 'linkedin' | 'github'
  /** 'music' = khu nghe nhạc 3D (MusicZone), không vẽ tấm phủ chữ; panel là trình phát nhạc */
  kind?: 'music' | 'desk'
  nav?: boolean
  href?: string
  /** Tuỳ chỉnh góc camera khi bay tới bảng (mặc định: dist 0.6, yawOffset 0.22, lift 0.035, shift 0.06) */
  view?: { dist?: number; yawOffset?: number; lift?: number; shift?: number }
  content?: { title: string; body?: string; tags?: string[]; items?: Item[]; cta?: { label: string; href: string } }
}

export const SIGNS: Sign[] = [
  {
    style: 'inset', id: 'neon', label: 'Neon Street', text: 'Neon Street',
    pos: [-0.401, 0.5365, 0.4092], yaw: -0.8194, size: [0.1924, 0.0354],
    bg: '#0a2e36', color: '#7ff6ff', glow: '#19e3f5', flicker: 0.9,
  },
  {
    style: 'inset', id: 'cssbattle', label: 'CSS Battle', text: 'CSS Battle\nGlobal Rank',
    pos: [-0.3833, 0.4762, 0.429], yaw: -0.8305, size: [0.1538, 0.0467],
    bg: '#1b1b20', color: '#ffffff', glow: '#cfd8ff', nav: true,
    content: {
      title: 'CSS Battle – Global Rank',
      body: 'Thành tích thi đấu CSS Battle. Thay nội dung này bằng thứ hạng và link hồ sơ của bạn.',
      cta: { label: 'Xem hồ sơ', href: 'https://cssbattle.dev' },
    },
  },
  {
    style: 'inset', id: 'projects', label: 'Projects', text: 'Projects',
    pos: [-0.331, 0.3572, 0.4462], yaw: -0.849, size: [0.1122, 0.0411],
    bg: '#2a2108', color: '#ffe36b', glow: '#ffc400', flicker: 0.3, nav: true,
    content: {
      title: 'Projects',
      items: P.projects,
      cta: { label: 'GitHub', href: P.github },
    },
  },
  {
    style: 'inset', id: 'about', label: 'About Me', text: 'About Me',
    pos: [-0.442, 0.3018, 0.3146], yaw: -0.9906, size: [0.1561, 0.044],
    bg: '#2a2108', color: '#ffe36b', glow: '#ffc400', flicker: 0.3, nav: true,
    content: {
      title: 'About Me',
      body: P.about,
      tags: Object.values(P.skills).flat().slice(0, 8),
      cta: { label: 'LinkedIn', href: P.linkedin },
    },
  },
  {
    style: 'inset', id: 'billboard', label: 'Billboard', text: 'Portfolio\n2026',
    pos: [0.1558, 0.4687, 0.2964], yaw: -1.4706, size: [0.2444, 0.0921],
    bg: '#3a0f5c', color: '#ffffff', glow: '#ff5fd8', nav: true,
    view: { dist: 1.0, yawOffset: -0.3, lift: 0.25, shift: 0.1 }, // nhìn chéo từ trên cao để không bị cột biển che
    content: {
      title: 'Portfolio 2026',
      body: P.role + ' — sẵn sàng cho dự án mới.',
      cta: { label: 'Liên hệ', href: 'mailto:' + P.email },
    },
  },
  {
    id: 'skills', label: 'Skills', text: 'Skills', sub: 'React · .NET · AI',
    pos: [-0.287, 0.211, -0.246], yaw: 0, size: [0.2, 0.072],
    bg: '#06241a', color: '#8dffbf', glow: '#22ff88', flicker: 0.5, nav: true,
    content: {
      title: 'Skills',
      items: Object.entries(P.skills).map(([title, v]) => ({ title, desc: v.join(' · ') })),
    },
  },
  {
    id: 'experience', label: 'Experience', text: 'Experience',
    pos: [-0.3245, 0.4455, -0.2828], yaw: 0, size: [0.1509, 0.0221],
    bg: '#2b1205', color: '#ffb06b', glow: '#ff7a1a', nav: true,
    content: {
      title: 'Experience',
      items: P.experience,
    },
  },
  {
    id: 'blog', label: 'Blog', text: 'Blog', sub: 'Notes & Writing',
    pos: [0.23, 0.32, 0.228], yaw: -1.55, size: [0.145, 0.057],
    bg: '#2a0a2a', color: '#ff9cf0', glow: '#ff4fe0', flicker: 0.4, nav: true,
    view: { dist: 1.0, yawOffset: -0.3, lift: 0.25, shift: 0.1 },
    content: {
      title: 'Blog',
      items: P.posts,
      cta: { label: 'Đọc blog', href: '/blog' },
    },
  },
  {
    id: 'contact', label: 'Contact', text: 'Contact', sub: 'Say hello',
    pos: [0.1436, 0.2322, 0.2886], yaw: -1.5229, size: [0.1446, 0.0514],
    bg: '#3a0b0b', color: '#ffd9a0', glow: '#ff4a3a', nav: true,
    view: { dist: 1.0, yawOffset: -0.3, lift: 0.25, shift: 0.1 },
    content: {
      title: 'Contact',
      body: P.email,
      tags: ['Email', 'GitHub', 'LinkedIn'],
      cta: { label: 'Gửi email', href: 'mailto:' + P.email },
    },
  },
  {
    id: 'resume', label: 'Resume', text: 'CV', sub: 'Download',
    pos: [0.3145, 0.1345, 0.4392], yaw: 0, size: [0.059, 0.0733],
    bg: '#0d1822', color: '#e6f7ff', glow: '#6fd3ff', nav: true,
    content: {
      title: 'Resume',
      body: 'Tải CV bản PDF.',
      cta: { label: 'Mở CV', href: P.cv },
    },
  },
  {
    id: 'music', label: 'Music', kind: 'music', nav: true,
    // TV phát nhạc ở "góc mới" bên trái phố (xem TV_POS/TV_YAW trong NeonStreet)
    pos: [-1.2, 0.255, -0.25], yaw: 0.95, size: [0.5, 0.31], glow: '#ff3fd0',
    view: { dist: 1.25, yawOffset: 0.18, lift: 0.05, shift: 0.1 },
  },
  {
    id: 'desk', label: 'My Desk', kind: 'desk', nav: true,
    // bàn máy tính ở góc đen bên phải phố (xem DESK_POS/DESK_YAW trong NeonStreet); PC mini trên đường là cổng vào
    pos: [2.9, 0.58, -0.6], yaw: -1.0, size: [1.5, 0.6], glow: '#7b3bff',
    view: { dist: 2.1, yawOffset: 0, lift: 0.1, shift: 0 },
  },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', glow: '#ff3b3b', pos: [-0.3628, 0.275, 0.4431], yaw: -0.83, size: [0.064, 0.045], href: 'https://youtube.com' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', glow: '#2fb8ff', pos: [-0.3593, 0.215, 0.4373], yaw: -0.83, size: [0.045, 0.045], href: P.linkedin },
  { id: 'github', label: 'GitHub', icon: 'github', glow: '#ffffff', pos: [-0.3557, 0.155, 0.4315], yaw: -0.83, size: [0.045, 0.045], href: P.github },
]

/* ---------- Camera & Presets ---------- */
export type View = { pos: Vec3; target: Vec3 }

export type CameraPreset = 'default' | 'wide' | 'isometric' | 'street' | 'top'

export const CAMERA_PRESETS: Record<CameraPreset, { label: string; icon: string; desc: string; view: View }> = {
  default: {
    label: 'Toàn cảnh',
    icon: '🏙️',
    desc: 'Góc nhìn nghiêng chuẩn ban đầu',
    view: { pos: [-1.25, 0.5, 1.25], target: [0, 0.3, 0] },
  },
  wide: {
    label: 'Bao quát',
    icon: '📐',
    desc: 'Tự do lùi xa để thấy toàn bộ thành phố',
    view: { pos: [-1.95, 0.9, 1.95], target: [0, 0.25, 0] },
  },
  isometric: {
    label: 'Isometric',
    icon: '🏛️',
    desc: 'Góc nhìn 3D mô hình từ trên cao',
    view: { pos: [-2.2, 1.65, 2.2], target: [0, 0.2, 0] },
  },
  street: {
    label: 'Mặt đường',
    icon: '🚶',
    desc: 'Góc nhìn ngang người đi bộ dạo phố',
    view: { pos: [-0.55, 0.15, 0.42], target: [0, 0.22, -0.1] },
  },
  top: {
    label: 'Từ trên cao',
    icon: '🛰️',
    desc: 'Nhìn từ trên đỉnh các toà nhà xuống',
    view: { pos: [0.01, 2.7, 0.01], target: [0, 0.2, 0] },
  },
}

export const HOME_VIEW: View = CAMERA_PRESETS.default.view
export const INTRO_VIEW: View = { pos: [-2.6, 1.3, 2.6], target: [0, 0.3, 0] }

/** Camera đứng trước bảng, lệch nhẹ để chừa chỗ cho panel bên trái. */
export function viewForSign(s: Sign): View {
  const { dist = 0.6, yawOffset = 0.22, lift = 0.035, shift = 0.06 } = s.view ?? {}
  const yaw = s.yaw + yawOffset
  const n: Vec3 = [Math.sin(yaw), 0, Math.cos(yaw)]
  const r: Vec3 = [Math.cos(s.yaw), 0, -Math.sin(s.yaw)] // trục ngang của bảng
  const target: Vec3 = [s.pos[0] - r[0] * shift, s.pos[1], s.pos[2] - r[2] * shift]
  const pos: Vec3 = [target[0] + n[0] * dist, s.pos[1] + lift, target[2] + n[2] * dist]
  return { pos, target }
}
