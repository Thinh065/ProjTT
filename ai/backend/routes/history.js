const express = require("express");
const mongoose = require("mongoose");
const ChatHistory = require("../models/ChatHistory");
const { auth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(auth);

const MAX_MESSAGES = 500;
const MAX_CONTENT_LENGTH = 50_000;
// Một document MongoDB tối đa 16 MB (tiếng Việt có dấu tới 3 byte/ký tự): giữ tổng nội dung ≤ 4 triệu ký tự,
// vượt thì bỏ bớt tin cũ nhất thay vì để lần lưu bị lỗi.
const MAX_TOTAL_CONTENT = 4_000_000;

const isAdmin = (req) => req.user.role === "admin";

const summary = (c) => {
  const last = c.messages?.[c.messages.length - 1];
  return {
    id: String(c._id),
    user: c.user,
    botId: c.botId,
    botName: c.botName,
    title: c.title,
    messageCount: c.messageCount ?? c.messages?.length ?? 0,
    lastMessage: c.lastMessage ?? (last ? String(last.content).slice(0, 200) : ""),
    totalTokens: c.totalTokens || 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

const full = (c) => ({ ...summary(c), messages: c.messages || [] });

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const clean = messages
    .filter((m) => m && ["user", "assistant", "system"].includes(m.role))
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, MAX_CONTENT_LENGTH),
      // Ngày không hợp lệ ("abc") làm Mongoose báo CastError → dùng thời điểm hiện tại
      timestamp: Number.isNaN(new Date(m.timestamp ?? NaN).getTime()) ? new Date() : new Date(m.timestamp),
      tokens: Math.max(0, Number(m.tokens) || 0),
      ...(Array.isArray(m.sourceChunks) && m.sourceChunks.length
        ? { sourceChunks: m.sourceChunks.slice(0, 20).map((chunk) => String(chunk).slice(0, 5_000)) }
        : {}),
    }));
  // Bỏ tin cũ nhất cho tới khi tổng nội dung nằm trong giới hạn
  let total = clean.reduce((sum, m) => sum + m.content.length + (m.sourceChunks || []).join("").length, 0);
  while (total > MAX_TOTAL_CONTENT && clean.length > 1) {
    const dropped = clean.shift();
    total -= dropped.content.length + (dropped.sourceChunks || []).join("").length;
  }
  return clean;
}

// Tìm một cuộc trò chuyện mà user hiện tại được phép truy cập
async function findAccessible(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "ID không hợp lệ" });
    return null;
  }
  const chat = await ChatHistory.findById(req.params.id);
  if (!chat || (String(chat.user) !== req.user.id && !isAdmin(req))) {
    res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    return null;
  }
  return chat;
}

// Danh sách cuộc trò chuyện (tóm tắt). Admin có thể xem của user khác bằng ?userId=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    let userId = req.user.id;
    if (req.query.userId && req.query.userId !== req.user.id) {
      if (!isAdmin(req)) return res.status(403).json({ message: "Không có quyền" });
      if (!mongoose.isValidObjectId(req.query.userId)) {
        return res.status(400).json({ message: "userId không hợp lệ" });
      }
      userId = req.query.userId;
    }

    const match = { user: new mongoose.Types.ObjectId(userId) };
    if (req.query.botId) match.botId = String(req.query.botId);

    const chats = await ChatHistory.aggregate([
      { $match: match },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          user: 1,
          botId: 1,
          botName: 1,
          title: 1,
          totalTokens: 1,
          createdAt: 1,
          updatedAt: 1,
          messageCount: { $size: "$messages" },
          lastMessage: { $substrCP: [{ $ifNull: [{ $last: "$messages.content" }, ""] }, 0, 200] },
        },
      },
    ]);

    const totalTokens = chats.reduce((s, c) => s + (c.totalTokens || 0), 0);
    res.json({ chats: chats.map(summary), totalTokens });
  })
);

// Chi tiết một cuộc trò chuyện
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const chat = await findAccessible(req, res);
    if (chat) res.json({ chat: full(chat) });
  })
);

// Tạo mới hoặc cập nhật cuộc trò chuyện của chính mình
router.post(
  "/save",
  asyncHandler(async (req, res) => {
    const { id, botId, botName } = req.body;
    const title = String(req.body.title || "Cuộc trò chuyện mới").slice(0, 200);
    const messages = sanitizeMessages(req.body.messages);
    const totalTokens = messages.reduce((s, m) => s + m.tokens, 0);

    if (id) {
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID không hợp lệ" });
      const chat = await ChatHistory.findOneAndUpdate(
        { _id: id, user: req.user.id },
        { title, messages, totalTokens },
        { new: true }
      );
      if (!chat) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
      return res.json({ chat: full(chat) });
    }

    if (!botId) return res.status(400).json({ message: "Thiếu botId" });
    const chat = await ChatHistory.create({
      user: req.user.id,
      botId: String(botId),
      botName: String(botName || ""),
      title,
      messages,
      totalTokens,
    });
    res.status(201).json({ chat: full(chat) });
  })
);

// Đổi tên
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const chat = await findAccessible(req, res);
    if (!chat) return;
    const title = String(req.body.title || "").trim().slice(0, 200);
    if (!title) return res.status(400).json({ message: "Thiếu tiêu đề" });
    chat.title = title;
    await chat.save();
    res.json({ chat: summary(chat) });
  })
);

// Xóa
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const chat = await findAccessible(req, res);
    if (!chat) return;
    await chat.deleteOne();
    res.json({ success: true });
  })
);

module.exports = router;
