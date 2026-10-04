# Neon Street – 3D interactive portfolio (Next.js + React Three Fiber)

## Chạy
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```
Ép chất lượng để test: `/?quality=high` hoặc `/?quality=low`.

## Cấu trúc
```
app/page.tsx                    dynamic import (ssr:false)
lib/signs.ts                    <<< SỬA Ở ĐÂY: bảng hiệu, nội dung panel, link, góc camera
components/neon/
  NeonStreet.tsx                Canvas + state (bảng đang chọn, mưa, chất lượng)
  Street.tsx                    load GLB (meshopt + WebP), unlit material, anisotropy
  Signs.tsx                     tấm chữ neon (canvas texture), hover, nhấp nháy, click
  CameraRig.tsx                 intro, bay tới bảng, tự xoay khi idle
  Effects.tsx                   Bloom + Vignette + SMAA (high) | SMAA (low)
  Rain.tsx, Dust.tsx            hiệu ứng mưa, bụi neon
  Overlay.tsx                   loader, nav, panel nội dung, nút bật/tắt
public/models/neon-street.glb   model đã nén (4.7MB, gốc 61MB)
```

## Tính năng chính
- **Thời gian**: Đêm / Hoàng hôn / Ngày (đổi bầu trời, độ sáng phố, độ sáng neon, bloom).
- **Thời tiết**: Quang / Mưa / Sương / Bão (bão có sét + sấm). Giá trị nằm ở `lib/mood.ts` (`TIME_PRESETS`, `WEATHER_PRESETS`).
- **Vật thể chuyển động**: drone neon (`Drones.tsx`), đèn pha quét trời (`Searchlight.tsx`), hơi nước từ mặt đường (`Steam.tsx`), bụi neon, mưa.
- **Âm thanh** (tạo bằng WebAudio, không cần file): mưa, nhạc nền synth, tiếng bấm, sấm. Bật bằng nút "Âm thanh". Code ở `lib/audio.ts`.
- **UX**: gợi ý lần đầu, phím ←/→ chuyển bảng, Esc về toàn cảnh, link sâu `#about`, `#projects`..., bảng điều khiển thu gọn trên mobile.

## Sửa bảng hiệu
Trong `lib/signs.ts`, mỗi phần tử của `SIGNS` có `text`, `bg/color/glow`, `flicker`,
`content` (panel), `href`, `view` (góc camera). Thêm bảng mới: lấy toạ độ `pos`/`yaw`
trên model rồi thêm một phần tử mới.

## Ghi chú
- Model gốc (Tripo) chỉ có 1 mesh + 1 texture đã bake nên không có skeleton animation.
  Hoạt cảnh là hiệu ứng procedural (mưa, bụi, nhấp nháy, camera).
- Texture gốc 4096² cho cả khu phố nên phần ngoài bảng vẫn hơi mờ; để nét hơn cần model/texture độ phân giải cao hơn.
- `PerformanceMonitor` tự hạ về chất lượng thấp khi FPS tụt; mobile mặc định chất lượng thấp.
- Điều hướng: đổi `href` trong `content.cta` thành route thật (`/projects`...) hoặc dùng `router.push` trong `NeonStreet.tsx`.

## Cập nhật mới
- `lib/profile.ts`: toàn bộ nội dung portfolio (tên, email, link, dự án, skills, kinh nghiệm, bài viết) – chỉ sửa file này.
- Vệt sáng + gợn nước trên mặt đường (`LightPools`), nút **Tour** tự bay qua các bảng, DPR thích ứng theo FPS, gợi ý riêng cho touch.
- **Khu nghe nhạc** (`lib/music.ts`, `components/neon/MusicZone.tsx`): sàn diễn giữa đường với equalizer 3D + đĩa than xoay. Nhạc synth tạo bằng WebAudio (3 bài, không cần file). Muốn dùng bài của bạn: thêm `src: '/music/ten-bai.mp3'` vào `TRACKS`.
