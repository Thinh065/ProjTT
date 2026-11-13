const express = require("express");
const ApiKey = require("../models/ApiKey");
const { auth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { getOpenRouterApiKey } = require("../utils/openrouter");

const router = express.Router();

const maskKey = (key = "") => (key.length <= 8 ? "****" : `${key.slice(0, 4)}…${key.slice(-4)}`);

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
    const bots = await ApiKey.find(filter).select("-baseURL -referer -title").sort({ createdAt: 1 });
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
    res.json(bots.map(({ apiKey, ...bot }) => ({
      ...bot,
      apiKeyMasked: apiKey
        ? maskKey(apiKey)
        : getOpenRouterApiKey(bot.baseURL) ? "Key dùng chung (.env)" : "Chưa cấu hình",
    })));
  })
);

// Thêm ChatBot mới
router.post(
  "/",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, apiKey, baseURL, model, image, referer, title, description } = req.body;
    if (!name || !baseURL) {
      return res.status(400).json({ message: "Thiếu tên hoặc Base URL" });
    }
    if (!isHttpUrl(baseURL)) {
      return res.status(400).json({ message: "Base URL không hợp lệ" });
    }
    const botApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!botApiKey && !getOpenRouterApiKey(baseURL)) {
      return res.status(400).json({
        message: "Nhập API Key riêng hoặc cấu hình OPENROUTER_API_KEY cho Base URL OpenRouter.",
      });
    }
    const bot = await ApiKey.create({
      name,
      apiKey: botApiKey,
      baseURL,
      model,
      image,
      referer,
      title,
      description,
    });
    const { apiKey: _omit, ...safe } = bot.toObject();
    res.status(201).json(safe);
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
    );
    if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" });
    res.json(bot);
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
