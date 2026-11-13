# Bàn giao giữa các agent — Trang chủ ProjTT (`ai/frontend`)

> Đọc file này **trước khi sửa trang chủ**. Mỗi agent khi làm xong hãy **thêm một mục mới ở đầu phần "Nhật ký"** (ai, ngày, đã làm gì, file nào), đừng xoá mục của agent khác.
> Chạy local: backend `npm --prefix ai/backend run start` (cổng 5000; không có MongoDB thì `run dev:memory`), frontend `npm --prefix ai/frontend run dev` (cổng 3000). Test: `npm --prefix ai/backend test`. Xem thêm `README.md`.

## Trạng thái hiện tại (2026-11-10, cập nhật lần 3 — sau đợt audit dọn code)

- **Claude phụ trách trang chủ** (`ai/frontend/app/page.js`, `ai/frontend/components/landing/**`) theo yêu cầu người dùng.
- **Chỉ còn một giao diện: mẫu D sáng** (người dùng chốt 2026-11-10). Bộ chọn mẫu D/E/F/Tối, `?mock=`, `?bg=`, bản tối (HeroBackground ASCII + Orb) và nền tối từng phần (SectionBackdrop) **đã gỡ hẳn** trong đợt audit. `.lp` luôn có `data-theme="light"`.
- Nền Particles có đường nối, `layout="even"` (rải blue-noise — do Claude thêm vào `react-bits/Particles.jsx`), 280 hạt, xoay chậm, parallax theo chuột. Đừng đổi mật độ/kiểu rải nếu người dùng không yêu cầu.
- Bản sao lưu trước audit: `C:\Code\_backup\ProjectTT-truoc-audit-20261110\` (`ProjectTT-src.tar` + `git-diff.patch`). Muốn lấy lại file nào đã xóa thì giải nén từ đó.
- **Chưa commit gì** (nhánh `fix/audit-security-history`). Commit chỉ đứng tên người dùng (Thinh065), không thêm Co-Authored-By.

## Việc đang giao cho Antigravity (`agy` CLI, chạy song song)

| Mã | Đề bài | Model | Chỉ được sửa | Báo cáo |
|---|---|---|---|---|
| T2 | `.agents/tasks/T2-dashboard-light.md` — khu dashboard tông sáng | `gemini-4-argon-high` | `app/dashboard/**`, `components/chat/**`, `components/layout/Header.js`, `components/ui/ConfirmDialog.js` | `.agents/reports/T2.md` |
| T3 | `.agents/tasks/T3-auth-light.md` — đăng nhập/đăng ký/quên mật khẩu tông sáng | `gemini-4-argon-low` | `app/auth/**` | `.agents/reports/T3.md` |
| T4 | `.agents/tasks/T4-mascot-favicon.md` — vẽ lại linh vật CyberFox + favicon | `gemini-4-argon-high` | `components/landing/CyberFox.js`, `app/icon.svg` | `.agents/reports/T4.md` |

Agent làm việc ghi báo cáo vào `.agents/reports/`, **không sửa file này** — Claude gộp vào Nhật ký.

## Ai làm phần nào

| Phần | Chủ | File |
|---|---|---|
| Trang chủ: bố cục, các phần, nền sáng | **Claude** | `app/page.js`, `components/landing/**` |
| Dashboard / Auth / Linh vật | Antigravity T2 / T3 / T4 | xem bảng trên |

## Cách nền sáng hoạt động (Claude)

- `page.js` đặt `data-theme="light"` lên `.lp` và render **một** `<LightBackdrop variant="converge"/>` (lớp `position: fixed`, `z-index: -1`, Particles tải động bằng `next/dynamic`).
- Trang đăng nhập/đăng ký/quên mật khẩu dùng `<LightBackdrop variant="trust"/>` (DotGrid + vầng tím đầu trang). `LightBackdrop.js` chỉ còn 2 biến thể này.
- Toàn bộ màu sáng nằm trong `landing-light.css`, **luôn có tiền tố `.lp[data-theme="light"]`**. Nhiều chỗ phải dùng `!important` vì `landing.css` vẫn còn màu nền tối và chữ trắng viết cứng từ thời bản tối (chưa gộp — xem Việc còn mở).
  - Thêm khối mới có nền/chữ tối viết cứng? → thêm class đó vào danh sách `:is(...)` "Bề mặt" hoặc "Chữ" trong `landing-light.css`.

## Bẫy đã gặp (đừng lặp lại)

- **WebGL + React Strict Mode:** đừng dùng lại cùng một `<canvas>` sau `loseContext()` — nền đen/trắng trên GPU Intel (ANGLE/D3D11). Cách đúng: tạo canvas mới trong `useEffect` và `canvas.remove()` khi cleanup.
- Trình duyệt bên phải của app Claude có thể bị hạ tốc độ (1–5 fps): hiệu ứng hiện dần khi cuộn (`data-reveal`) có thể chưa chạy nên các phần trông trống — đó không phải lỗi. Kiểm tra màu thật trên trình duyệt của người dùng.
- Gói `motion` dùng cho SquishSwitch/RubberSegment/BlurText. Trước đây `npm install` cần `--legacy-peer-deps` vì `react-day-picker` ↔ `date-fns`; hai gói này đã bỏ khỏi `package.json` nên có thể không cần nữa (chưa thử cài lại).
- `BlurText` render `<p>` → đừng bọc trong `<p>` (lỗi hydration).
- Component React Bits copy vào `react-bits/` phải giữ **khối ghi bản quyền** ở đầu file (MIT + Commons Clause). Lấy code qua MCP: `.mcp.json` (shadcn MCP, registry `@react-bits` trong `ai/frontend/components.json`).

## Việc còn mở

1. ~~Đồng bộ dashboard với tông sáng~~ — đã chạy thử khi đăng nhập (2026-11-13): dashboard, lịch sử, quản trị, hồ sơ hiển thị đúng, không lỗi console.
2. Thiếu `favicon.ico` (đã có `app/icon.svg`); nút "Đăng nhập" (StarBorder) vẫn tông tối trên nền sáng.
3. **Xoay vòng các API key cũ từng lộ trong lịch sử git; đổi `JWT_SECRET` thật trong `ai/backend/.env`** (backend giờ cảnh báo nếu < 32 ký tự và từ chối chạy ở `NODE_ENV=production`).
4. Gộp `landing-light.css` vào `landing.css` (bỏ các màu tối viết cứng và `!important`) — cần chụp so sánh từng phần.
5. ~~Chọn trình quản lý gói~~ — đã chọn **npm**: commit `package-lock.json`, bỏ `yarn.lock`; Dockerfile dùng `npm ci`.
6. `next.config.mjs` vẫn bỏ qua ESLint khi build vì dự án chưa cài ESLint.
7. `npm audit` còn: `cloudinary` v1 (cần v2, nhưng `multer-storage-cloudinary` chỉ hỗ trợ v1 → phải tự viết upload stream); `sharp`/`protobufjs` cũ kéo theo từ `chromadb-default-embed` (chỉ dùng cho đồng bộ Chroma tùy chọn). Dockerfile/docker-compose chưa chạy thử (máy không có Docker).

## Nhật ký

- **2026-11-14 · Claude (avatar bot theo hãng)** — `components/chat/BotAvatar.js`: avatar bot = ảnh riêng (`image`) → logo hãng đoán từ `model`/tên (Simple Icons qua Iconify: NVIDIA, Baidu, Gemini, OpenAI, Claude, Meta, Mistral, DeepSeek, Qwen, Microsoft, Perplexity, Hugging Face) → robot mặc định. Bot có `icon` riêng (Tư vấn ESH) giữ nguyên. Dùng ở `BotSelector`, `ChatInterface` (màn trống, tin nhắn, đang gõ) và bảng ChatBot trang quản trị. Thêm hãng mới: thêm một dòng vào `BRANDS`.

- **2026-11-14 · Claude (làm sạch lịch sử git)** — Theo yêu cầu người dùng. Dùng `git-filter-repo` gỡ `ai/backend/.env` (từng commit trong 32 commit), mọi `node_modules/` và thay 14 giá trị key trong các `.env*` cũ bằng `***REMOVED***`; giữ commit và tác giả. Force-push `main` + `fix/audit-security-history` (hash mọi commit đã đổi), xóa nhánh `fix/fix_env`. Repo 128 MB → 18 MB. Sao lưu lịch sử cũ (CÒN chứa key): `C:\Code\_backup\ProjTT-truoc-xoa-lich-su-20261113.git`. **Ai có bản clone cũ phải clone lại**, đừng push lịch sử cũ lên. `refs/pull/1` và `refs/pull/2` trên GitHub vẫn giữ commit cũ (chỉ GitHub Support xóa được) → **vẫn phải thu hồi key**.

- **2026-11-14 · Claude (đăng nhập + model free)**
  - Không đăng nhập được: người dùng đang dùng backend `dev:memory` (Mongo tạm) — đã chuyển cổng 5000 về backend thật (Atlas, DB `Sand`). Trên Atlas, admin duy nhất có mật khẩu **chữ thường, không phải bcrypt** (sửa tay trên Atlas) → luôn báo sai mật khẩu. Đã xóa admin cũ, tạo lại `admin2@projtt.test` bằng `npm run create-admin` (script mới `scripts/createAdmin.js`, băm bcrypt; `--reset` để đặt lại). 7 bản ghi `chatlogs` chuyển sang admin mới. **Đừng sửa mật khẩu trực tiếp trên Atlas.**
  - Tiếp nhận phiên Codex 13/11 (`~/.codex/sessions/2026/11/13/rollout-2026-11-13T01-42-52-…jsonl`, đã tạm dừng): 3 model OpenRouter free đã thêm. Kiểm tra lại 14/11: Nemotron 3.5 Lightning, ERNIE 5.5 Flash Preview chạy; **Apodex 1.1 Mini bị OpenRouter gỡ** → đã xóa, thay bằng **Nemotron 3 Ultra (Free)** (`nvidia/nemotron-3-ultra-550b-a55b:free`, dùng `OPENROUTER_API_KEY` chung). Gemma 4 free đang 429, Inkling 2 Small chỉ cho agent, Dots3-Note chậm (~9 s). Hugging Face: không có provider chat miễn phí.

- **2026-11-13 · Claude (bot ESH: nguồn + cache chung)** — Theo yêu cầu người dùng.
  - Bỏ khối "**Nguồn tham khảo**" khỏi nội dung trả lời (`utils/eshBot.js` → `validateAnswer`); tài liệu + số trang chỉ còn ở mục "Nguồn thông tin" (`sourceChunks`). Tin cũ đã lưu được lọc khi hiển thị/gửi lại qua `ai/frontend/lib/chat.js`; trang Lịch sử có thêm mục "Nguồn thông tin".
  - Cache dùng chung: câu hỏi độc lập lưu với `user: null` cho mọi tài khoản; câu nối tiếp hội thoại vẫn riêng theo tài khoản. So khớp trên phần lõi câu hỏi (`coreQuestion` bỏ "Dạ cho em hỏi…", "…ạ?", "…vậy?"); nguồn đã trích chỉ cần nằm trong 10 trang liên quan nhất; cách hỏi mới trúng cache được lưu thêm làm bí danh; hàng đợi theo nhóm câu hỏi chung. `policy: 3` trong namespace nên cache cũ (per-user, có khối nguồn) tự hết hiệu lực.
  - Trích dẫn: chấp nhận khác biệt định dạng (Markdown, ngoặc kép, gạch ngang, "…" rút gọn) nhưng chữ phải nguyên văn. Gemini 503 tự thử lại 1 lần sau 2 giây; quá tải → thông báo tiếng Việt (429).
  - Test: 27/27 (`npm --prefix ai/backend test`). Chạy thật: admin hỏi "Trường ESH có những chương trình học nào?" (gọi Gemini), tài khoản khác hỏi "ESH dạy những chương trình gì?" → cùng câu trả lời, 0 token.

- **2026-11-13 · Claude (kiểm tra & hoàn thiện)** — Không đổi giao diện.
  - Backend: tách `app.js` (Express) khỏi `server.js` (env + DB + listen); thêm `utils/rateLimit.js` (đăng nhập 20/15 phút/IP, đăng ký 10/giờ/IP, upload ảnh 20/giờ/IP, chat 30/phút/tài khoản); `GET /api/auth/me`; kiểm tra id trước khi upload avatar; lỗi JSON hỏng → 400; lỗi bot ESH (thiếu `GEMINI_API_KEY`, Gemini 429/502) trả đúng thông báo; nạp `chromadb`/`@huggingface/inference` lười; cảnh báo `JWT_SECRET` yếu; `TRUST_PROXY`.
  - Test: `npm test` = 13 test API mới (`test/api.test.js`, MongoDB trong bộ nhớ) + 10 test ESH cũ → 23/23 qua. Thêm `npm run dev:memory` (backend + Mongo tạm + admin thử, launch config `backend-memory`).
  - Frontend: đăng xuất dùng `logout()` chung (xóa cả `currentChatId`/`currentBotId`); layout dashboard gọi `/api/auth/me` để kiểm tra token và làm mới quyền/avatar; chặn gửi tin khi đang lưu lịch sử (trước đây gửi nhanh có thể tạo 2 cuộc trò chuyện); bỏ race khi đổi bot nhanh; ghim `@iconify/react`.
  - Gói: chọn npm, dọn `node_modules` thừa, `npm audit fix` (không --force). Dockerfile backend/frontend viết lại (Debian slim, `npm ci`, frontend build production), thêm `docker-compose.yml`, `.dockerignore`, `README.md`. `.gitignore`: commit `package-lock.json`, bỏ qua `.next/` và tệp cá nhân ở thư mục gốc (PDF/PNG/hồ sơ ứng tuyển).
  - Kiểm tra: `tsc` + `next build` sạch; chạy thật với `dev:memory`: đăng nhập admin, hỏi bot ESH (Gemini trả lời có trích trang, lưu lịch sử, câu diễn đạt lại trúng cache 0 token, không tạo trùng), các trang lịch sử/quản trị/hồ sơ không lỗi console.

- **2026-11-13 · Codex** — Căn giữa theo chiều dọc khung minh họa phần “Ba bước để hỏi” trên desktop trong `components/landing/landing.css`.

- **2026-11-12 · Codex** — Trang chủ: đổi nút xác thực sang Magnet nhẹ, nút đăng nhập nền lavender, làm lại mắt và hoạt ảnh vẫy tai CyberFox. Cập nhật `app/page.js` và `components/landing/{CyberFox.js,landing.css,landing-light.css}`.

- **2026-11-10 23:30 · Claude (audit)** — Dọn code theo yêu cầu audit, không đổi giao diện mẫu D. Đã sao lưu trước (`C:\Code\_backup\ProjectTT-truoc-audit-20261110\`).
  - Xóa: bản tối + bộ chọn mẫu (`HeroBackground.js`, `SectionBackdrop.js`, `FluidFlame.jsx`, `OwlHead.js`, 17 nền React Bits không còn dùng + CSS), mẫu E; `BgSwitcher`/`MockSwitch` và các prop `backdrop`/`intensity` trong `page.js`; CSS `.lp-fluid*`, `.lp-bg-picker`, `.lp-orb-glow`, `.lp-sec-backdrop*`, `.lp-mockswitch*`; 43 file shadcn `components/ui/*` không dùng (còn 8), `hooks/` (bản trùng), `theme-provider.tsx`, `styles/globals.css`, ảnh placeholder/`steps.jpg` không dùng, `pnpm-lock.yaml` rỗng.
  - `package.json` frontend: bỏ 45 gói không import (Azure, cloudinary, 26 gói Radix, recharts, zod…). Backend: bỏ 8 gói không require (openai, axios, pdf-parse, mammoth, node-fetch, nextjs-cors, react-markdown, @azure/core-sse); giữ 2 gói embed của chromadb vì chromadb có thể nạp lúc chạy.
  - Backend: gỡ 2 endpoint không ai gọi — `POST /api/upload/chat-image` và `GET /api/auth/verify`.
  - Đơn giản: login/đăng ký/hồ sơ dùng `apiFetch` thay cho `fetch` tự viết (mất mạng thì báo "Không kết nối được tới server", 401 tự đăng xuất); bỏ nhánh "tài khoản bị chặn" phía client không bao giờ chạy (backend đã trả 403 khi đăng nhập); bỏ khối `images` trong `next.config.mjs` (không dùng `next/image`) và glob `pages/` thừa trong Tailwind; bật lại kiểm tra TypeScript khi build (bỏ `ignoreBuildErrors`, `tsc` sạch).
  - Kiểm tra: `next build` qua, trang `/` từ 179 kB → 91,2 kB (First Load 307 → 219 kB); chụp trang chủ, đăng nhập, đăng ký: không lỗi console. Backend: `node --check` + nạp thử các route. **Chưa chạy backend thật** (không đụng DB) và chưa thử dashboard khi đăng nhập.

- **2026-11-10 01:00 · Antigravity (argon-high)** — T4 xong: CyberFox vẽ lại tông tím/lavender/xanh lơ (giữ API), favicon `app/icon.svg` (báo cáo `.agents/reports/T4.md`). T2 sửa 10 file dashboard rồi hết quota Argon (429, reset ~133h) — chưa kiểm tra khi đăng nhập (`.agents/reports/T2.md`). **Quota Argon đã cạn: việc mới cho agy dùng `gemini-3.8-flash-*` hoặc model khác.**
- **2026-11-10 · Claude** — Người dùng chốt mẫu D. Particles thêm `layout="even"` (blue-noise, có chiều sâu, giữ xoay). T3 (auth sáng) xong — báo cáo viết hộ ở `.agents/reports/T3.md`. T2/T4 chạy lại 00:42, đề bài cấm chạy lệnh shell (headless `agy` tự từ chối quyền `command`).
- **2026-11-10 · Claude** — Người dùng giao trang chủ cho Claude. Sửa lỗi trang (page.js còn gọi MOCK_PRESETS sau khi argon rút gọn SectionBackdrop.js); thay Studio bằng bộ chọn nhỏ D/E/F/Tối; mẫu D dùng Particles dày hơn, E LineWaves, F DotGrid; Hero sáng 2 cột cân bằng. Giao T2/T3/T4 cho `agy`.
- **2026-11-10 00:11 · argon** — Rút gọn `SectionBackdrop.js` (gỡ Mock Studio + mọi preset, nền tối tĩnh). Phiên tạo hình linh vật bị người dùng dừng; rewind không được.
- **2026-11-10 · Claude** — Thêm 3 mock sáng D/E/F vào Studio của argon (một nền chung cho cả trang, không WebGL), file `LightBackdrop.js`, `landing-light.css`; sửa wordmark TechText theo `currentColor`. Đã chụp kiểm tra desktop (D/E/F) và điện thoại (D): không lỗi console, không tràn ngang.
- **(trước 2026-11-10) · argon** — Thêm "Studio Duyệt Mock" với mẫu tối A/B/C (nền WebGL React Bits riêng từng phần, bố cục bento), nhãn/số thứ tự các phần.
- **(trước đó) · Claude** — Hero ASCII + Orb, micro React Bits các phần dưới, sửa bảo mật backend, lịch sử chat MongoDB, mobile drawer dashboard.
