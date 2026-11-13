# T3 · Trang đăng nhập / đăng ký / quên mật khẩu tông sáng (giao cho Antigravity)

**Model:** `gemini-4-argon-low` (Gemini 4 Argon · effort thấp) — 3 trang giống nhau, đổi giao diện là chính.

## Bối cảnh
Next.js 15 ở `ai/frontend`. Trang chủ đang chuyển sang **tông sáng** (xem `http://localhost:3000/?mock=trust`). Ba trang `app/auth/login`, `app/auth/register`, `app/auth/forgot-password` đang nền tối (dùng `HeroBackground scrim="cta"`) → cần chuyển sang sáng cho đồng bộ.
Đọc trước: `AGENT_HANDOFF.md` ở thư mục gốc.

## Việc cần làm
1. Bỏ `HeroBackground` ở 3 trang. Dùng nền sáng chung bằng component có sẵn:
   `import LightBackdrop from "@/components/landing/LightBackdrop"` → `<LightBackdrop variant="trust" />` (lưới chấm DotGrid trên nền trắng). CHỈ import, không sửa file đó.
2. Thẻ form: nền trắng `rgba(255,255,255,.88)`, viền `rgba(76,29,149,.12)`, bóng `0 12px 32px -18px rgba(76,29,149,.22)`, bo 18px. Chữ `#1d1530`, chữ phụ `#5d566f`, link/nhấn tím `#7c3aed`. Ô nhập nền trắng viền `rgba(76,29,149,.18)`, focus ring tím.
3. Giữ nguyên logic: gọi API đăng nhập/đăng ký, lưu token, thông báo lỗi, điền sẵn email từ `?email=`.

## Chỉ được sửa
- `ai/frontend/app/auth/**`

**Không sửa:** `components/landing/**`, `app/page.js`, `app/dashboard/**` (việc T2).

## Xong khi
- 3 trang hiển thị sáng, không lỗi console, không tràn ngang ở 390px; đăng nhập vẫn chuyển vào `/dashboard`.
- Ghi báo cáo vào `.agents/reports/T3.md`.

## Quy tắc chung (bắt buộc)
- **KHÔNG chạy bất kỳ lệnh shell/terminal nào** (không curl, ls, npm, node, git…) — chạy nền không được duyệt quyền và phiên sẽ bị dừng. Chỉ dùng công cụ đọc/tìm/ghi file. Việc kiểm tra trên trình duyệt do Claude làm sau.
- Đọc `AGENT_HANDOFF.md` ở thư mục gốc trước khi làm. Trang chủ (`ai/frontend/app/page.js`, `ai/frontend/components/landing/**` trừ file được giao) do **Claude** phụ trách — KHÔNG sửa.
- Chỉ sửa các file trong mục "Chỉ được sửa". Đang có agent khác làm song song ở file khác.
- Server đã chạy sẵn (frontend :3000, backend :5000) — không bật thêm.
- Không commit, không chạy git thay đổi trạng thái. Không cài thêm package.
- Không tạo dữ liệu trong MongoDB Atlas thật.
- Khi xong, ghi báo cáo ngắn vào `.agents/reports/T3.md` (đã làm gì, file nào, đã kiểm tra gì, còn gì). KHÔNG sửa `AGENT_HANDOFF.md` (Claude sẽ gộp).
