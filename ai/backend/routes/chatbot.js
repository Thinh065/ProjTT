const express = require("express");
const ApiKey = require("../models/ApiKey");
const { auth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const rateLimit = require("../utils/rateLimit");
const { callBot, streamBot, UpstreamError } = require("../utils/chatProviders");
const { callEshBot } = require("../utils/eshBot");

const router = express.Router();

const ESH_BOT_ID = "esh-bot";
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 20_000;

// Mỗi tài khoản tối đa 30 tin nhắn/phút (tránh đốt quota API)
const chatLimiter = rateLimit({ name: "chat", windowMs: 60 * 1000, max: 30, key: (req) => req.user.id });

// Chỉ giữ role/content hợp lệ, cắt bớt cho an toàn
function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const clean = messages
    .filter((m) => m && ["user", "assistant", "system"].includes(m.role))
    .map((m) => ({ role: m.role, content: String(m.content ?? "").slice(0, MAX_CONTENT_LENGTH) }))
    .slice(-MAX_MESSAGES);
  if (clean.length === 0 || clean[clean.length - 1].role !== "user") return null;
  return clean;
}

// Kiểm tra request; trả về { messages, bot } hoặc tự gửi lỗi 4xx và trả null
async function prepare(req, res) {
  const botId = typeof req.body.botId === "string" ? req.body.botId : "";
  const messages = sanitizeMessages(req.body.messages);
  if (!botId) {
    res.status(400).json({ message: "Thiếu botId" });
    return null;
  }
  if (!messages) {
    res.status(400).json({ message: "messages phải là mảng và kết thúc bằng tin nhắn của user" });
    return null;
  }
  if (botId === ESH_BOT_ID) return { messages, bot: null };
  const bot = await ApiKey.findById(botId).select("+apiKey").lean();
  if (!bot || (bot.hidden && req.user.role !== "admin")) {
    res.status(404).json({ message: "Không tìm thấy ChatBot" });
    return null;
  }
  return { messages, bot };
}

// Lỗi trả cho người dùng: lỗi có chủ đích (upstream, bot ESH thiếu cấu hình, Gemini quá tải), hết giờ
function publicError(err) {
  if (err instanceof UpstreamError || [429, 502, 503].includes(err.status)) {
    return { status: err.status, message: err.message };
  }
  if (err.name === "TimeoutError" || err.name === "AbortError") {
    return { status: 504, message: "AI phản hồi quá lâu, vui lòng thử lại" };
  }
  return null;
}

// Gửi tin nhắn, nhận nguyên câu trả lời. Client chỉ gửi botId, server tự lấy key/model từ DB.
router.post(
  "/dynamic",
  auth,
  chatLimiter,
  asyncHandler(async (req, res) => {
    const input = await prepare(req, res);
    if (!input) return;
    try {
      const result = input.bot
        ? await callBot(input.bot, input.messages)
        : await callEshBot(input.messages, req.user.id);
      res.json(result);
    } catch (err) {
      const known = publicError(err);
      if (!known) throw err;
      res.status(known.status).json({ message: known.message });
    }
  })
);

// Như /dynamic nhưng trả dần từng đoạn chữ (Server-Sent Events):
//   data: {"type":"delta","text":"..."}            nhiều lần
//   data: {"type":"done","message":...,"tokens":...,"sourceChunks":[...]}
//   data: {"type":"error","status":502,"message":"..."}
router.post(
  "/stream",
  auth,
  chatLimiter,
  asyncHandler(async (req, res) => {
    const input = await prepare(req, res);
    if (!input) return;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // tắt gom buffer ở reverse proxy
    });
    const send = (event) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    // Người dùng đóng tab / bấm dừng: hủy luôn request tới AI
    const controller = new AbortController();
    res.on("close", () => controller.abort());
    // Giữ kết nối khi bot ESH hoặc model chậm chưa trả chữ nào
    const heartbeat = setInterval(() => !res.writableEnded && res.write(": ping\n\n"), 15_000);

    try {
      const result = input.bot
        ? await streamBot(input.bot, input.messages, (text) => send({ type: "delta", text }), { signal: controller.signal })
        : await callEshBot(input.messages, req.user.id);
      if (!input.bot) send({ type: "delta", text: result.message });
      send({ type: "done", ...result });
    } catch (err) {
      if (!controller.signal.aborted) {
        const known = publicError(err);
        if (!known) console.error("Chat stream error:", err);
        send({ type: "error", status: known?.status || 500, message: known?.message || "Lỗi server" });
      }
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  })
);

module.exports = router;
