const mongoose = require("mongoose");

// Log các câu hỏi gửi tới bot tư vấn ESH (RAG) để phân tích/debug
const ChatLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  question: { type: String, required: true },
  sourceChunks: { type: [String], default: [] },
  answer: { type: String, default: "" },
  error: { type: String, default: "" },
  totalTokens: { type: Number, default: 0 },
  // Nhật ký chỉ để phân tích/debug: MongoDB tự xóa sau 180 ngày để collection không phình mãi
  createdAt: { type: Date, default: Date.now, expires: 180 * 24 * 60 * 60 },
});

module.exports = mongoose.model("ChatLog", ChatLogSchema);
