# T2 · Khu dashboard tông sáng, đồng bộ với trang chủ (giao cho Antigravity)

**Model:** `gemini-4-argon-high` (Gemini 4 Argon · effort cao) — nhiều file, phải giữ nguyên logic gọi API.

## Bối cảnh
Next.js 15 ở `ai/frontend`. Trang chủ đang được chuyển sang **tông sáng** (mock D/E/F, xem `?mock=trust` trên `http://localhost:3000`). Khu sau đăng nhập (`/dashboard`, `/dashboard/history`, `/dashboard/admin`, `/dashboard/profile`) đang là giao diện sáng kiểu cũ (xám/trắng shadcn) → cần đồng bộ cùng ngôn ngữ thiết kế với trang chủ sáng.
Đọc trước: `AGENT_HANDOFF.md` ở thư mục gốc, và `ai/frontend/components/landing/landing-light.css` (CHỈ ĐỌC — lấy bảng màu).

## Bảng màu (lấy từ landing-light.css)
- Nền trang `#fbfaff`, thẻ trắng `rgba(255,255,255,.82)`, viền `rgba(76,29,149,.12)`, bóng `0 12px 32px -18px rgba(76,29,149,.22)`.
- Chữ chính `#1d1530`, chữ phụ `#5d566f`. Nhấn tím `#7c3aed` (hover `#6d28d9`), nhạt `#f1edff`. Lỗi/chặn `#be123c` trên `#fff1f2`.
- Bo góc thẻ 16–18px, nút 10–12px. Font: Bricolage Grotesque (đang dùng ở trang chủ).

## Việc cần làm
1. Đổi giao diện các trang dashboard + thanh header + khung chat + danh sách bot + lịch sử + bảng quản trị + hồ sơ sang bảng màu trên.
2. **Giữ nguyên mọi logic**: gọi `apiFetch`, lưu lịch sử, ngăn kéo (drawer) danh sách bot trên điện thoại, xác nhận xoá, đổi tên chat. Không đổi API backend.
3. Kiểm tra điện thoại 390px: không tràn ngang, ngăn kéo vẫn mở/đóng.

## Chỉ được sửa
- `ai/frontend/app/dashboard/**`
- `ai/frontend/components/chat/**`
- `ai/frontend/components/layout/Header.js`
- `ai/frontend/components/ui/ConfirmDialog.js`

**Không sửa:** `ai/frontend/app/page.js`, `ai/frontend/components/landing/**` (Claude đang làm), `ai/frontend/app/auth/**` (việc T3), backend.

## Xong khi
- 4 trang dashboard hiển thị đúng bảng màu, không lỗi console, chat gửi/nhận và lưu lịch sử vẫn chạy (cần backend cổng 5000 và tài khoản thử; không tạo dữ liệu trong MongoDB Atlas thật nếu không được người dùng cho phép).
- Ghi báo cáo vào `.agents/reports/T2.md`.

## Quy tắc chung (bắt buộc)
- **KHÔNG chạy bất kỳ lệnh shell/terminal nào** (không curl, ls, npm, node, git…) — chạy nền không được duyệt quyền và phiên sẽ bị dừng. Chỉ dùng công cụ đọc/tìm/ghi file. Việc kiểm tra trên trình duyệt do Claude làm sau.
- Đọc `AGENT_HANDOFF.md` ở thư mục gốc trước khi làm. Trang chủ (`ai/frontend/app/page.js`, `ai/frontend/components/landing/**` trừ file được giao) do **Claude** phụ trách — KHÔNG sửa.
- Chỉ sửa các file trong mục "Chỉ được sửa". Đang có agent khác làm song song ở file khác.
- Server đã chạy sẵn (frontend :3000, backend :5000) — không bật thêm.
- Không commit, không chạy git thay đổi trạng thái. Không cài thêm package.
- Không tạo dữ liệu trong MongoDB Atlas thật.
- Khi xong, ghi báo cáo ngắn vào `.agents/reports/T2.md` (đã làm gì, file nào, đã kiểm tra gì, còn gì). KHÔNG sửa `AGENT_HANDOFF.md` (Claude sẽ gộp).
