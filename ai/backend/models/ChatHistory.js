const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    tokens: { type: Number, default: 0 },
    sourceChunks: { type: [String], default: undefined },
  },
  { _id: false }
);

const ChatHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // botId là ObjectId của ApiKey, hoặc "esh-bot" cho bot tư vấn ESH
    botId: { type: String, required: true, index: true },
    botName: { type: String, default: "" },
    title: { type: String, default: "Cuộc trò chuyện mới" },
    messages: { type: [MessageSchema], default: [] },
    totalTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatHistory", ChatHistorySchema);
