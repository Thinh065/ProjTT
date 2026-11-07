const mongoose = require("mongoose");

// Log các câu hỏi gửi tới bot tư vấn ESH (RAG) để phân tích/debug
const ChatLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  question: { type: String, required: true },
  sourceChunks: { type: [String], default: [] },
  answer: { type: String, default: "" },
  error: { type: String, default: "" },
  totalTokens: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatLog", ChatLogSchema);
