const mongoose = require("mongoose");

const answerCacheSchema = new mongoose.Schema({
  // null = cache dùng chung cho câu hỏi độc lập; có giá trị = câu hỏi nối tiếp hội thoại của tài khoản đó
  user: { type: mongoose.Schema.Types.ObjectId, default: null },
  namespace: { type: String, required: true },
  contextKey: { type: String, required: true },
  question: { type: String, required: true },
  normalizedQuestion: { type: String, required: true },
  constraints: { type: String, required: true },
  embedding: { type: [Number], required: true },
  message: { type: String, required: true },
  sourceChunks: { type: [String], required: true },
  sourceIds: { type: [String], required: true },
}, { timestamps: true });

answerCacheSchema.index({ user: 1, namespace: 1, contextKey: 1, normalizedQuestion: 1 }, { unique: true });
answerCacheSchema.index({ user: 1, namespace: 1, contextKey: 1, constraints: 1 });
// Mỗi lần đổi prompt/tài liệu/model, namespace đổi và cache cũ không còn được dùng. Tự xóa mục nào
// 60 ngày không được dùng tới (mỗi lần trúng cache, eshBot làm mới updatedAt) để collection không phình mãi.
answerCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model("EshAnswerCache", answerCacheSchema);
