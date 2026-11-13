const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_URL = `${OPENROUTER_BASE_URL}/chat/completions`;

function getOpenRouterApiKey(baseURL) {
  if (typeof baseURL !== "string") return "";
  const url = baseURL.trim().replace(/\/$/, "");
  if (url !== OPENROUTER_BASE_URL && url !== OPENROUTER_CHAT_URL) return "";
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

module.exports = { getOpenRouterApiKey, OPENROUTER_CHAT_URL };
