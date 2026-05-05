const mongoose = require("mongoose");

const ChatLogSchema = new mongoose.Schema({
  question: { type: String, required: true },
  sourceChunks: { type: [String], default: [] },
  answer: { type: String, default: "" },
  error: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  messages: [
    {
      role: String,
      content: String,
      tokens: { type: Number, default: 0 } // Thêm trường tokens cho mỗi message
    }
  ],
  totalTokens: { type: Number, default: 0 } // Thêm trường tổng tokens
});

module.exports = mongoose.model("ChatLog", ChatLogSchema);