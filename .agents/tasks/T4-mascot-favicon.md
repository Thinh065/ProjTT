# T4 · Làm lại linh vật bot CyberFox + favicon (giao cho Antigravity)

**Model:** `gemini-4-argon-high` (Gemini 4 Argon · effort cao) — việc thiết kế hình, cần tinh tế.

## Bối cảnh
Next.js 15 ở `ai/frontend`. Linh vật hiện tại là "CyberFox" — đầu cáo robot hoạt hình vẽ bằng SVG trong `ai/frontend/components/landing/CyberFox.js`, dùng khắp nơi (trang chủ, khung chat, header, trang đăng nhập). Người dùng muốn **vẽ lại linh vật** cho đẹp và hợp tông mới: trang chủ đang chuyển sang **nền sáng** (xem http://localhost:3000, mẫu D/E/F; bản tối ở `?mock=dark`). Linh vật hiện quá tối (đen) trên nền sáng.
Hướng: đầu cáo robot hoạt hình, dễ thương, thân thiện (người xem có phụ huynh/học sinh), lấy cảm hứng con cáo thật nhưng cách điệu như đầu robot; kính/visor phát sáng; màu chủ đạo tím `#7c3aed`/tím nhạt `#ddd6fe` + điểm xanh lơ `#22d3ee`; đọc rõ cả trên nền trắng lẫn nền tối.

## Việc cần làm
1. Vẽ lại SVG trong `CyberFox.js`. **Giữ nguyên API** của component: tên export mặc định, các props `size`, `sleepy`, `label`, `className` và hành vi (mắt khép khi `sleepy`, biến CSS `--eyes-open` từ 0.06→1 điều khiển độ mở mắt khi cuộn trang, class `lp-awake` trên tổ tiên). Không đổi chỗ import ở file khác.
2. Tạo favicon `ai/frontend/app/icon.svg` từ đầu linh vật mới: nền vuông bo góc tím `#7c3aed`, ít chi tiết, đọc rõ ở 16×16 và 32×32 (Next.js tự phục vụ `app/icon.svg`).
3. Kiểm tra trên http://localhost:3000 (sáng) và `?mock=dark` (tối): linh vật rõ, không vỡ bố cục; trình duyệt không còn 404 favicon.

## Chỉ được sửa
- `ai/frontend/components/landing/CyberFox.js`
- `ai/frontend/app/icon.svg` (mới)

## Quy tắc chung (bắt buộc)
- **KHÔNG chạy bất kỳ lệnh shell/terminal nào** (không curl, ls, npm, node, git…) — chạy nền không được duyệt quyền và phiên sẽ bị dừng. Chỉ dùng công cụ đọc/tìm/ghi file. Việc kiểm tra trên trình duyệt do Claude làm sau.
- Đọc `AGENT_HANDOFF.md` ở thư mục gốc trước khi làm. Trang chủ (`ai/frontend/app/page.js`, `ai/frontend/components/landing/**` trừ file được giao) do **Claude** phụ trách — KHÔNG sửa.
- Chỉ sửa các file trong mục "Chỉ được sửa". Đang có agent khác làm song song ở file khác.
- Server đã chạy sẵn (frontend :3000, backend :5000) — không bật thêm.
- Không commit, không chạy git thay đổi trạng thái. Không cài thêm package.
- Không tạo dữ liệu trong MongoDB Atlas thật.
- Khi xong, ghi báo cáo ngắn vào `.agents/reports/T4.md` (đã làm gì, file nào, đã kiểm tra gì, còn gì). KHÔNG sửa `AGENT_HANDOFF.md` (Claude sẽ gộp).
