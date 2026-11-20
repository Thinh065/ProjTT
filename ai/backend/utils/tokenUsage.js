// tokensUsed của User = tổng token AI thật do server ghi nhận (routes/chatbot.js cộng dồn sau mỗi câu trả lời).
// Tài khoản có từ trước khi có trường này: khởi tạo một lần từ tổng token trong lịch sử chat cũ.
const User = require("../models/User");
const ChatHistory = require("../models/ChatHistory");

async function backfillTokensUsed() {
  const legacy = await User.find({ tokensUsed: { $exists: false } }).select("_id").lean();
  if (!legacy.length) return 0;
  const ids = legacy.map((u) => u._id);
  const totals = await ChatHistory.aggregate([
    { $match: { user: { $in: ids } } },
    { $group: { _id: "$user", total: { $sum: "$totalTokens" } } },
  ]);
  const byUser = new Map(totals.map((t) => [String(t._id), t.total]));
  await User.bulkWrite(ids.map((_id) => ({
    updateOne: {
      // Điều kiện $exists để không ghi đè nếu trong lúc chạy server đã kịp cộng token cho tài khoản này
      filter: { _id, tokensUsed: { $exists: false } },
      update: { $set: { tokensUsed: byUser.get(String(_id)) || 0 } },
    },
  })));
  return legacy.length;
}

module.exports = { backfillTokensUsed };
