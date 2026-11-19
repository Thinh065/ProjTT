const express = require("express");
const ApiKey = require("../models/ApiKey");
const { auth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { getOpenRouterApiKey } = require("../utils/openrouter");
const { callBot } = require("../utils/chatProviders");

const router = express.Router();

const maskKey = (key = "") => (key.length <= 8 ? "****" : `${key.slice(0, 4)}…${key.slice(-4)}`);

const toSafeAdminBot = (doc) => {
  const obj = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  const { apiKey, ...safe } = obj;
  return {
    ...safe,
    apiKeyMasked: apiKey
      ? maskKey(apiKey)
      : getOpenRouterApiKey(safe.baseURL)
        ? "Key dùng chung (.env)"
        : "Chưa cấu hình",
  };
};

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

// Danh sách ChatBot cho người dùng đã đăng nhập (KHÔNG có apiKey)
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "admin" ? {} : { hidden: false };
    const bots = await ApiKey.find(filter).select("-baseURL -referer -title -health").sort({ createdAt: 1 });
    res.json(bots);
  })
);

// Danh sách đầy đủ cho admin (apiKey được che bớt)
router.get(
  "/admin",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bots = await ApiKey.find().select("+apiKey").sort({ createdAt: 1 }).lean();
    res.json(bots.map(toSafeAdminBot));
  })
);

const EDITABLE = ["name", "description", "baseURL", "model", "image", "referer", "title"];
const str = (value, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : undefined);

// Thêm ChatBot mới
router.post(
  "/",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const fields = {};
    for (const field of EDITABLE) {
      const value = str(req.body[field], field === "description" ? 1000 : 500);
      if (value !== undefined) fields[field] = value;
    }
    if (!fields.name || !fields.baseURL) {
      return res.status(400).json({ message: "Thiếu tên hoặc Base URL" });
    }
    if (!isHttpUrl(fields.baseURL)) {
      return res.status(400).json({ message: "Base URL không hợp lệ" });
    }
    const botApiKey = str(req.body.apiKey, 1000) || "";
    if (!botApiKey && !getOpenRouterApiKey(fields.baseURL)) {
      return res.status(400).json({
        message: "Nhập API Key riêng hoặc cấu hình OPENROUTER_API_KEY cho Base URL OpenRouter.",
      });
    }
    const bot = await ApiKey.create({ ...fields, apiKey: botApiKey });
    res.status(201).json(toSafeAdminBot(bot));
  })
);

// Sửa thông tin ChatBot. apiKey: bỏ trống = giữ key cũ; clearApiKey: true = xóa key riêng (dùng key chung)
router.patch(
  "/:id",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await ApiKey.findById(req.params.id).select("+apiKey");
    if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" });

    for (const field of EDITABLE) {
      const value = str(req.body[field], field === "description" ? 1000 : 500);
      if (value !== undefined) bot[field] = value;
    }
    if (!bot.name || !bot.baseURL) return res.status(400).json({ message: "Thiếu tên hoặc Base URL" });
    if (!isHttpUrl(bot.baseURL)) return res.status(400).json({ message: "Base URL không hợp lệ" });
    const newKey = str(req.body.apiKey, 1000);
    if (newKey) bot.apiKey = newKey;
    else if (req.body.clearApiKey === true) bot.apiKey = "";
    if (!bot.apiKey && !getOpenRouterApiKey(bot.baseURL)) {
      return res.status(400).json({ message: "Nhập API Key riêng hoặc cấu hình OPENROUTER_API_KEY cho Base URL OpenRouter." });
    }
    bot.health = undefined; // cấu hình đổi thì kết quả kiểm tra cũ không còn đúng
    await bot.save();
    res.json(toSafeAdminBot(bot));
  })
);

// Gửi một câu chào ngắn để xem bot còn gọi được không (model free hay bị gỡ khỏi OpenRouter)
async function checkBot(bot) {
  const started = Date.now();
  let health;
  try {
    await callBot(bot, [{ role: "user", content: "Trả lời đúng một từ: OK" }], { maxTokens: 64 });
    health = { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    const message = err.name === "TimeoutError" ? "Quá thời gian chờ" : err.message || "Lỗi không rõ";
    health = { ok: false, latencyMs: Date.now() - started, error: String(message).slice(0, 300) };
  }
  health.checkedAt = new Date();
  await ApiKey.updateOne({ _id: bot._id }, { health });
  return { _id: bot._id, name: bot.name, health };
}

router.post(
  "/check",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bots = await ApiKey.find().select("+apiKey").lean();
    res.json(await Promise.all(bots.map(checkBot)));
  })
);

router.post(
  "/:id/check",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await ApiKey.findById(req.params.id).select("+apiKey").lean();
    if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" });
    res.json(await checkBot(bot));
  })
);

// Tạm ẩn hoặc hiện ChatBot
router.patch(
  "/:id/hide",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { hidden: !!req.body.hidden },
      { new: true }
    ).select("+apiKey");
    if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" });
    res.json(toSafeAdminBot(bot));
  })
);

// Xóa ChatBot
router.delete(
  "/:id",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await ApiKey.findByIdAndDelete(req.params.id);
    if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" });
    res.json({ message: "Đã xóa ChatBot" });
  })
);

module.exports = router;
