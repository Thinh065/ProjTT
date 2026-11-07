const express = require("express");
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const ApiKey = require("../models/ApiKey");
const ChatLog = require("../models/ChatLog");
const { auth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { buildEshPrompt, NO_INFO_ANSWER } = require("../utils/prompts");

const router = express.Router();

const ESH_BOT_ID = "esh-bot";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 20_000;

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
  const endpoint = bot.baseURL.endsWith("/chat/completions")
    ? bot.baseURL
    : bot.baseURL.replace(/\/$/, "") + "/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bot.apiKey}`,
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

// Bot tư vấn ESH: RAG trên ChromaDB + Gemini
async function callEshBot(messages, userId) {
  const question = messages[messages.length - 1].content;
  const conversation = messages
    .slice(-7, -1)
    .map((m) => `${m.role === "user" ? "Học sinh" : "Cô Thuỷ"}: ${m.content}`)
    .join("\n");

  let sourceChunks = [];
  try {
    const { searchSimilarChunks } = require("../models/KnowledgeChunk");
    const chunks = await searchSimilarChunks(question, 10);
    sourceChunks = (chunks || []).filter((c) => c && !c.startsWith(NO_INFO_ANSWER.slice(0, 12)));
  } catch (err) {
    console.error("RAG search error:", err.message);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new UpstreamError("Server chưa cấu hình GEMINI_API_KEY", 500);
  }

  const model = process.env.GEMINI_MODEL || "gemma-3n-e2b-it";
  const prompt = buildEshPrompt({ context: sourceChunks.join("\n\n"), conversation, question });

  let answer = "";
  let errorText = "";
  let tokens = { input: 0, output: 0, total: 0 };
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, topK: 40, topP: 0.95, maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      errorText = upstreamErrorMessage(data, `Gemini API lỗi (${response.status})`);
      throw new UpstreamError(errorText, response.status === 429 ? 429 : 502);
    }
    answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    const u = data.usageMetadata || {};
    tokens = {
      input: u.promptTokenCount || 0,
      output: u.candidatesTokenCount || 0,
      total: u.totalTokenCount || (u.promptTokenCount || 0) + (u.candidatesTokenCount || 0),
    };
    return { message: answer || "Không có phản hồi từ Gemini", tokens, sourceChunks };
  } catch (err) {
    errorText = errorText || err.message;
    throw err;
  } finally {
    ChatLog.create({
      user: userId,
      question,
      sourceChunks,
      answer,
      error: errorText,
      totalTokens: tokens.total,
    }).catch((e) => console.error("ChatLog error:", e.message));
  }
}

// Gửi tin nhắn tới một ChatBot. Client chỉ gửi botId, server tự lấy apiKey/baseURL/model từ DB.
router.post(
  "/dynamic",
  auth,
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
      if (err instanceof UpstreamError) {
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
