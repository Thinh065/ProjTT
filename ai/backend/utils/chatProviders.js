// Gọi các ChatBot dùng API tương thích OpenAI: OpenRouter, OpenAI, GitHub Models
// (models.github.ai / models.inference.ai.azure.com), Gemini OpenAI-compatible...
const { getOpenRouterApiKey, OPENROUTER_CHAT_URL } = require("./openrouter");

const REQUEST_TIMEOUT_MS = 60_000;

class UpstreamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const tokensFromUsage = (usage = {}) => {
  const input = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  return { input, output, total: usage.total_tokens || input + output };
};

const upstreamErrorMessage = (data, fallback) =>
  (typeof data?.error === "string" ? data.error : data?.error?.message) || data?.message || fallback;

function chatEndpoint(baseURL) {
  const url = String(baseURL || "").trim().replace(/\/$/, "");
  return url.endsWith("/chat/completions") ? url : `${url}/chat/completions`;
}

function buildRequest(bot, messages, { stream = false, maxTokens } = {}) {
  const configuredKey = bot.apiKey?.trim();
  const sharedKey = configuredKey ? "" : getOpenRouterApiKey(bot.baseURL);
  if (!configuredKey && !sharedKey) throw new UpstreamError("ChatBot chưa có API key.", 503);
  return {
    // Key dùng chung chỉ được gửi tới đúng địa chỉ OpenRouter, không theo redirect
    url: sharedKey ? OPENROUTER_CHAT_URL : chatEndpoint(bot.baseURL),
    init: {
      method: "POST",
      ...(sharedKey && { redirect: "error" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${configuredKey || sharedKey}`,
        ...(bot.referer && { "HTTP-Referer": bot.referer }),
        ...(bot.title && { "X-Title": bot.title }),
      },
      body: JSON.stringify({
        model: bot.model,
        messages,
        ...(maxTokens && { max_tokens: maxTokens }),
        ...(stream && { stream: true, stream_options: { include_usage: true } }),
      }),
    },
  };
}

async function failFromResponse(response) {
  const data = await response.json().catch(() => ({}));
  throw new UpstreamError(
    upstreamErrorMessage(data, `Lỗi từ API (${response.status})`),
    response.status === 429 ? 429 : 502
  );
}

function withTimeout(signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

// Gọi một lần, nhận nguyên câu trả lời
async function callBot(bot, messages, { signal, maxTokens } = {}) {
  const { url, init } = buildRequest(bot, messages, { maxTokens });
  const response = await fetch(url, { ...init, signal: withTimeout(signal) });
  if (!response.ok) await failFromResponse(response);
  const data = await response.json().catch(() => ({}));
  if (data.error) throw new UpstreamError(upstreamErrorMessage(data, "Lỗi từ API"), 502);
  return { message: data.choices?.[0]?.message?.content || "", tokens: tokensFromUsage(data.usage) };
}

// Gọi dạng stream (Server-Sent Events của OpenAI): onDelta(text) cho từng đoạn chữ mới
async function streamBot(bot, messages, onDelta, { signal } = {}) {
  const { url, init } = buildRequest(bot, messages, { stream: true });
  const response = await fetch(url, { ...init, signal: withTimeout(signal) });
  if (!response.ok) await failFromResponse(response);
  if (!response.body || !/event-stream/.test(response.headers.get("content-type") || "")) {
    // Nhà cung cấp không hỗ trợ stream: trả nguyên khối
    const data = await response.json().catch(() => ({}));
    if (data.error) throw new UpstreamError(upstreamErrorMessage(data, "Lỗi từ API"), 502);
    const message = data.choices?.[0]?.message?.content || "";
    if (message) onDelta(message);
    return { message, tokens: tokensFromUsage(data.usage) };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let message = "";
  let usage;
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue; // bỏ dòng trống và comment ": OPENROUTER PROCESSING"
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let event;
      try { event = JSON.parse(payload); } catch { continue; }
      if (event.error) throw new UpstreamError(upstreamErrorMessage(event, "Lỗi từ API"), 502);
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) {
        message += delta;
        onDelta(delta);
      }
      if (event.usage) usage = event.usage;
    }
  }
  return { message, tokens: tokensFromUsage(usage) };
}

module.exports = { callBot, streamBot, UpstreamError, REQUEST_TIMEOUT_MS };
