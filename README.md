# ProjTT — Mọi AI trong một khung chat

Ứng dụng web chat với nhiều mô hình AI (OpenRouter, GitHub Models, mọi API tương thích OpenAI) và **bot tư vấn tuyển sinh ESH** dùng RAG trên tài liệu thật của trường, có trích dẫn nguồn theo trang. Lịch sử chat và số token được lưu theo từng tài khoản; admin quản lý người dùng và danh sách ChatBot.

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS | `ai/frontend` |
| Backend | Express 4, MongoDB (Mongoose 8), JWT | `ai/backend` |
| Bot ESH | Embedding đa ngôn ngữ chạy local (Transformers.js) + Gemini | `ai/backend/utils/eshBot.js`, `ai/backend/knowledgeBase` |

## Chạy trên máy

Yêu cầu Node.js 20 trở lên. Dự án dùng **npm** (có `package-lock.json`).

```bash
npm --prefix ai/backend install
npm --prefix ai/frontend install
```

Tạo file cấu hình (không commit file `.env`):

```bash
cp ai/backend/.env.example ai/backend/.env
cp ai/frontend/.env.example ai/frontend/.env.local
```

Trong `ai/backend/.env`, tối thiểu cần `MONGO_URI` và `JWT_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Bot ESH cần thêm `GEMINI_API_KEY` và tải model embedding một lần:

```bash
npm --prefix ai/backend run prepare:embeddings
```

Chạy hai server (backend cổng 5000, frontend cổng 3000):

```bash
npm --prefix ai/backend run start
```

```bash
npm --prefix ai/frontend run dev
```

### Không có MongoDB?

`npm --prefix ai/backend run dev:memory` chạy backend với MongoDB tạm trong bộ nhớ và tự tạo một tài khoản admin (email/mật khẩu in ra console). Dữ liệu mất khi tắt — chỉ dùng để thử.

### Tạo tài khoản admin

Đăng ký bình thường trên giao diện, rồi đổi `role` của tài khoản đó thành `"admin"` trong collection `users` (MongoDB Compass/Atlas). Từ đó admin có thể cấp quyền cho người khác trong trang **Quản trị hệ thống**.

## Kiểm thử

```bash
npm --prefix ai/backend test
```

Gồm test API (đăng ký/đăng nhập, phân quyền, lịch sử chat, khóa tài khoản, rate limit — chạy trên MongoDB trong bộ nhớ) và test quy tắc trích nguồn/cache của bot ESH. Lần đầu có thể tải binary `mongod` (~100 MB).

```bash
npm --prefix ai/frontend run build
```

## Chạy bằng Docker

```bash
docker compose up --build
```

`docker-compose.yml` chạy MongoDB, backend và frontend; backend đọc `ai/backend/.env`. Khi đưa lên server thật, sửa `NEXT_PUBLIC_API_BACKEND` (build arg của frontend) và `CORS_ORIGIN` thành tên miền thật, và đặt `TRUST_PROXY=1` nếu chạy sau reverse proxy.

## Bảo mật

- API key của ChatBot chỉ nằm ở server; trình duyệt chỉ gửi `botId`. Key dùng chung cho OpenRouter đặt ở `OPENROUTER_API_KEY`.
- Mọi API trừ đăng ký/đăng nhập/upload ảnh đăng ký đều cần JWT; tài khoản bị khóa bị chặn ngay cả khi token còn hạn.
- Giới hạn tần suất: đăng nhập 20 lần/15 phút/IP, đăng ký 10 lần/giờ/IP, upload ảnh không đăng nhập 20 lần/giờ/IP, chat 30 tin/phút/tài khoản (bộ nhớ trong process — chạy nhiều instance thì cần Redis).
- **Các key cũ từng nằm trong lịch sử git (`ai/backend/.env.example` ở các commit cũ) phải được thu hồi/tạo lại** ở GitHub, OpenRouter, Gemini, Cloudinary, Hugging Face, Chroma và MongoDB Atlas.

## Cấu trúc API

| Route | Mô tả |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Đăng ký, đăng nhập (trả JWT 7 ngày) |
| `GET /api/auth/me` | Tài khoản hiện tại |
| `GET /api/auth/users` | (admin) Danh sách user kèm tổng token |
| `PATCH/DELETE /api/users/:id…` | Đổi tên, mật khẩu, avatar; admin đổi quyền/khóa/xóa |
| `GET/POST/PATCH/DELETE /api/apikeys…` | Danh sách ChatBot; admin thêm/ẩn/xóa |
| `POST /api/chatbot/dynamic` | Gửi tin nhắn tới một ChatBot (`botId: "esh-bot"` là bot tư vấn ESH) |
| `GET/POST/PUT/DELETE /api/chat/history…` | Lịch sử chat của mình; admin xem của người khác qua `?userId=` |
| `POST /api/upload/avatar` | Upload ảnh (đăng ký, ảnh bot) lên Cloudinary |
| `GET /health` | Tình trạng server và kết nối MongoDB |
