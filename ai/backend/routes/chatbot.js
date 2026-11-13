const express = require("express");
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const ApiKey = require("../models/ApiKey");
const { auth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const rateLimit = require("../utils/rateLimit");
const { getOpenRouterApiKey, OPENROUTER_CHAT_URL } = require("../utils/openrouter");
const { callEshBot } = require("../utils/eshBot");

const router = express.Router();

const ESH_BOT_ID = "esh-bot";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 20_000;

// Mỗi tài khoản tối đa 30 tin nhắn/phút (tránh đốt quota API)
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, key: (req) => req.user.id });

class UpstreamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

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

const tokensFromOpenAIUsage = (usage = {}) => {
  const input = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  return { input, output, total: usage.total_tokens || input + output };
};

const upstreamErrorMessage = (data, fallback) =>
  (typeof data?.error === "string" ? data.error : data?.error?.message) || data?.message || fallback;

// GitHub Models (Azure AI Inference)
async function callGithubModel(bot, messages) {
  const client = ModelClient(bot.baseURL, new AzureKeyCredential(bot.apiKey));
  const response = await client.path("/chat/completions").post({
    body: { messages, model: bot.model },
    timeout: REQUEST_TIMEOUT_MS,
  });
  if (isUnexpected(response)) {
    throw new UpstreamError(upstreamErrorMessage(response.body, "Lỗi từ GitHub Models"), 502);
  }
  return {
    message: response.body.choices?.[0]?.message?.content || "",
    tokens: tokensFromOpenAIUsage(response.body.usage),
  };
}

// Bất kỳ API tương thích OpenAI (OpenRouter, OpenAI, Gemini OpenAI-compatible, ...)
async function callOpenAICompatible(bot, messages) {
  const configuredKey = bot.apiKey?.trim();
  const sharedKey = configuredKey ? "" : getOpenRouterApiKey(bot.baseURL);
  if (!configuredKey && !sharedKey) {
    throw new UpstreamError("ChatBot chưa có API key.", 503);
  }
  const baseURL = bot.baseURL.trim().replace(/\/$/, "");
  const endpoint = baseURL.endsWith("/chat/completions") ? baseURL : `${baseURL}/chat/completions`;

  const response = await fetch(sharedKey ? OPENROUTER_CHAT_URL : endpoint, {
    method: "POST",
    ...(sharedKey && { redirect: "error" }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${configuredKey || sharedKey}`,
      ...(bot.referer && { "HTTP-Referer": bot.referer }),
      ...(bot.title && { "X-Title": bot.title }),
    },
    body: JSON.stringify({ model: bot.model, messages }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    throw new UpstreamError(upstreamErrorMessage(data, `Lỗi từ API (${response.status})`), status);
  }
  return {
    message: data.choices?.[0]?.message?.content || "",
    tokens: tokensFromOpenAIUsage(data.usage),
  };
}

// Gửi tin nhắn tới một ChatBot. Client chỉ gửi botId, server tự lấy apiKey/baseURL/model từ DB.
router.post(
  "/dynamic",
  auth,
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { botId } = req.body;
    const messages = sanitizeMessages(req.body.messages);
    if (!botId) return res.status(400).json({ message: "Thiếu botId" });
    if (!messages) {
      return res.status(400).json({ message: "messages phải là mảng và kết thúc bằng tin nhắn của user" });
    }

    try {
      let result;
      if (botId === ESH_BOT_ID) {
        result = await callEshBot(messages, req.user.id);
      } else {
        const bot = await ApiKey.findById(botId).select("+apiKey").lean();
        if (!bot || (bot.hidden && req.user.role !== "admin")) {
          return res.status(404).json({ message: "Không tìm thấy ChatBot" });
        }
        const isGithub = /models\.github\.ai|models\.inference\.ai\.azure\.com/.test(bot.baseURL);
        result = isGithub
          ? await callGithubModel(bot, messages)
          : await callOpenAICompatible(bot, messages);
      }
      res.json(result);
    } catch (err) {
      // Lỗi có chủ đích từ upstream hoặc bot ESH (thiếu cấu hình, Gemini quá tải...)
      if (err instanceof UpstreamError || [429, 502, 503].includes(err.status)) {
        return res.status(err.status).json({ message: err.message });
      }
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        return res.status(504).json({ message: "AI phản hồi quá lâu, vui lòng thử lại" });
      }
      throw err;
    }
  })
);

module.exports = router;
