const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  status: { type: String, default: "active" },
  avatar: { type: String, default: "" },
  resetRequestedAt: { type: Date, default: null },
  // Tăng mỗi lần đổi/đặt lại mật khẩu: JWT mang số cũ hết hiệu lực ngay (đăng xuất mọi phiên cũ)
  tokenVersion: { type: Number, default: 0 },
  // Tổng token AI thật do server ghi nhận (không tin số token trình duyệt gửi lên khi lưu lịch sử)
  tokensUsed: { type: Number },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("User", userSchema)