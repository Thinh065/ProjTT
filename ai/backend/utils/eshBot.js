const AnswerCache = require("../models/EshAnswerCache");
const ChatLog = require("../models/ChatLog");
const { getKnowledgeIndex, searchKnowledge, hash, normalizeSearchText } = require("./localKnowledge");
const { embedTexts, cosineSimilarity } = require("./localEmbeddings");
const { buildEshPrompt, ESH_SYSTEM_PROMPT, NO_INFO_ANSWER } = require("./prompts");

const ZERO_TOKENS = { input: 0, output: 0, total: 0 };
const userQueues = new Map();
const normalizeQuestion = (text) => String(text).normalize("NFC").toLowerCase()
  .replace(/[^\p{L}\p{N}%+\-]+/gu, " ").trim();
// Bỏ lời chào/từ đệm đầu-cuối câu ("Dạ cho em hỏi ... ạ?") để các cách hỏi giống nhau so khớp được
const coreQuestion = (text) => String(text).normalize("NFC").trim()
  .replace(/^(?:(?:dạ|vâng|à|ừ|chào (?:bạn|ad|admin|trường)|bạn ơi|ad ơi|admin ơi)[,!.\s]+)*/iu, "")
  .replace(/^(?:cho (?:mình|em|tôi|tớ|con|anh|chị|cháu|mẹ|ba|bố) hỏi(?: chút| xíu| một chút)?(?: là)?|(?:mình|em|tôi|tớ|anh|chị) (?:muốn|cần) hỏi(?: là)?|xin (?:cho )?hỏi(?: là)?|hỏi chút)[,:\s]+/iu, "")
  .replace(/\s*(?:vậy|thế|nhỉ|nhé|ha|hả)?\s*(?:ạ|à)?\s*([?？.!]*)$/iu, "$1")
  .trim() || String(text).trim();
const normalizeQuote = (text) => String(text).normalize("NFC").replace(/\s+/g, " ").trim();
// So khớp trích dẫn bỏ qua khác biệt định dạng (Markdown, kiểu ngoặc kép/gạch ngang, khoảng trắng),
// nhưng chữ và số vẫn phải nằm nguyên văn trong tài liệu.
const looseQuote = (text) => normalizeQuote(text)
  .replace(/[*_`#>|]+/g, " ")
  .replace(/[“”„«»]/g, "\"").replace(/[‘’]/g, "'").replace(/[‐‑‒–—―]/g, "-")
  .replace(/\s+/g, " ").trim();
// Gemini đôi khi rút gọn bằng "..." — mỗi đoạn (≥ 10 ký tự) phải có trong nguồn, theo đúng thứ tự
function quoteInSource(quote, sourceText) {
  const source = looseQuote(sourceText);
  const parts = looseQuote(quote).split(/\s*(?:\.{3}|…)\s*/).map((part) => part.replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")).filter(Boolean);
  if (!parts.length || parts.some((part) => part.length < 10)) return false;
  let from = 0;
  for (const part of parts) {
    const at = source.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

function cachedAnswer(entry, match) {
  return {
    message: entry.message,
    sourceChunks: entry.sourceChunks,
    tokens: { ...ZERO_TOKENS },
    cache: { hit: true, match },
  };
}

function questionConstraints(question) {
  const normalized = normalizeSearchText(question);
  const topics = [
    ["programs", /chuong trinh|dao tao|lo trinh/],
    ["tuition", /hoc phi|phi hoc/],
    ["admission", /tuyen sinh|nhap hoc|ho so|dang ky/],
    ["scholarship", /hoc bong/],
    ["transport", /xe|bus|dua ruoc|dua don/],
    ["meals", /an uong|tien an|phi an|bua an|dinh duong/],
    ["refund", /hoan phi|hoan hoc phi|bao luu|chuyen phi/],
    ["teachers", /giao vien|thay co/],
    ["facilities", /co so vat chat|ho boi|thu vien|phong hoc/],
  ].filter(([, pattern]) => pattern.test(normalized)).map(([topic]) => topic);
  return JSON.stringify({
    numbers: [...new Set(normalized.match(/\d+/g) || [])].sort(),
    programs: [...new Set(normalized.match(/\b(?:vce|aes|moet|oxford|stem|steam|sel|cvk)\b/g) || [])].sort(),
    periods: [...new Set(normalized.match(/\b(?:thang|ky|nam|ngay|tuan)\b/g) || [])].sort(),
    facets: [
      ["pool", /ho boi|be boi/], ["library", /thu vien/], ["bus", /xe bus|xe dua|dua ruoc|dua don/],
      ["lunch", /an trua/], ["breakfast", /an sang/], ["snack", /an xe/],
      ["preschool", /mam non/], ["primary", /tieu hoc/], ["secondary", /trung hoc|thcs|thpt/],
      ["registration", /dang ky|tuyen sinh|nhap hoc/], ["documents", /ho so|giay to/],
      ["deadline", /han chot|thoi han/], ["discount", /giam phi|giam hoc phi|chiet khau|uu dai/],
    ].filter(([, pattern]) => pattern.test(normalized)).map(([facet]) => facet),
    acronyms: [...new Set(String(question).match(/\b[A-Z]{2,}\b/g) || [])].map((word) => word.toLowerCase()).sort(),
    negated: /\b(?:khong|chua|ngoai tru|tru khi)\b/.test(normalized.replace(/(?:hay )?khong\s*$/, "")),
    hiddenFees: normalizeQuestion(question).includes("phí ẩn"),
    topics,
  });
}

function questionContextKey(messages) {
  const question = normalizeSearchText(messages.at(-1).content);
  const standalone = question.split(" ").length >= 6
    && /esh|truong|hoc phi|hoc bong|tuyen sinh|chuong trinh|giao vien|xe bus|xe dua/.test(question)
    && !/\b(?:do|nay|tren|vua noi|con toi|con em|toi dang|nhu vay)\b/.test(question)
    && !/^(?:con|vay|the|neu)\b/.test(question);
  return standalone ? "standalone" : hash(JSON.stringify(messages.slice(-7, -1)));
}

function validateAnswer(data, sources) {
  if (typeof data?.answer !== "string" || !data.answer.trim() || !Array.isArray(data.citations)) {
    throw new Error("Gemini trả về dữ liệu không hợp lệ.");
  }
  if (!data.citations.length) {
    const clarification = /[?？]\s*$/.test(data.answer.trim()) && data.answer.length < 400;
    return { message: clarification ? data.answer.trim() : NO_INFO_ANSWER, sourceChunks: [], sourceIds: [], cacheable: false };
  }
  const evidence = [];
  for (const citation of data.citations) {
    const match = /^S([1-9]\d*)$/.exec(citation.sourceId || "");
    const source = match && sources[Number(match[1]) - 1];
    const quote = normalizeQuote(citation.quote || "");
    if (!source || quote.length < 10 || !quoteInSource(quote, source.text)) {
      throw new Error("Trích dẫn của Gemini chưa khớp tài liệu gốc.");
    }
    evidence.push({ source, sourceId: citation.sourceId, quote });
  }
  const citedIds = new Set(evidence.map((item) => item.sourceId));
  const answerIds = [...data.answer.matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
  if (!answerIds.length || answerIds.some((id) => !citedIds.has(id))) {
    throw new Error("Câu trả lời chưa gắn đúng nguồn đã kiểm tra.");
  }
  const uniqueEvidence = [...new Map(evidence.map((item) => [item.sourceId, item])).values()];
  // Tên tài liệu + số trang nằm trong sourceChunks (giao diện hiện ở mục "Nguồn thông tin")
  return {
    message: data.answer.trim(),
    sourceChunks: uniqueEvidence.map((item) => `[${item.sourceId}] ${item.source.label}\n${item.quote}`),
    sourceIds: uniqueEvidence.map((item) => item.source.id),
    cacheable: true,
  };
}

const GEMINI_RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS) || 2000;

async function generateAnswer(model, messages, sources) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Server chưa cấu hình GEMINI_API_KEY.");
    error.status = 503;
    throw error;
  }
  const request = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ESH_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildEshPrompt({ sources, conversation: messages.slice(-7, -1), question: messages.at(-1).content }) }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answer: { type: "STRING" },
            citations: { type: "ARRAY", items: { type: "OBJECT", properties: { sourceId: { type: "STRING" }, quote: { type: "STRING" } }, required: ["sourceId", "quote"] } },
          },
          required: ["answer", "citations"],
        },
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  let response = await request();
  // Gemini quá tải tạm thời (503) thường hết sau vài giây: thử lại một lần
  if (response.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
    response = await request();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const overloaded = response.status === 429 || response.status === 503;
    const error = new Error(overloaded
      ? "Máy chủ AI (Gemini) đang quá tải, bạn vui lòng thử lại sau ít phút."
      : `Gemini API lỗi (${response.status}): ${data.error?.message || "không rõ nguyên nhân"}`);
    error.status = overloaded ? 429 : 502;
    throw error;
  }
  const text = data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("");
  let answer;
  try { answer = validateAnswer(JSON.parse(text), sources); } catch (cause) {
    const error = new Error(cause instanceof SyntaxError ? "Gemini chưa trả về câu trả lời hoàn chỉnh." : cause.message);
    error.status = 502;
    throw error;
  }
  const usage = data.usageMetadata || {};
  return { ...answer, tokens: { input: usage.promptTokenCount || 0, output: usage.candidatesTokenCount || 0, total: usage.totalTokenCount || 0 } };
}

const SEMANTIC_THRESHOLD = 0.84;

// Câu hỏi độc lập (về trường, không dựa vào hội thoại) dùng chung cache cho mọi tài khoản;
// câu hỏi nối tiếp hội thoại thì cache riêng theo tài khoản.
function cacheScope(messages, userId) {
  const question = coreQuestion(messages.at(-1).content);
  const contextKey = questionContextKey([...messages.slice(0, -1), { role: "user", content: question }]);
  const constraints = questionConstraints(question);
  const shared = contextKey === "standalone";
  return {
    question,
    contextKey,
    constraints,
    user: shared ? null : userId,
    queueKey: shared ? `shared:${constraints}` : `user:${userId}`,
  };
}

async function answerQuestion(messages, userId) {
  const originalQuestion = messages.at(-1).content;
  const { question, contextKey, constraints, user } = cacheScope(messages, userId);
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const index = await getKnowledgeIndex();
  const namespace = hash(JSON.stringify({ knowledge: index.version, prompt: ESH_SYSTEM_PROMPT, model, policy: 3 }));
  const normalizedQuestion = normalizeQuestion(question);
  const filter = { user, namespace, contextKey };
  const exact = await AnswerCache.findOne({ ...filter, normalizedQuestion }).lean();
  if (exact) return cachedAnswer(exact, "exact");

  const [embedding] = await embedTexts([question]);
  // Nguồn của câu đã lưu chỉ cần nằm trong nhóm 10 trang liên quan nhất là dùng lại được
  const related = searchKnowledge(index, embedding, question, 10);
  const sources = related.slice(0, 5);
  const candidates = await AnswerCache.find({ ...filter, constraints }).lean();
  const relatedIds = new Set(related.map((source) => source.id));
  const equivalent = candidates
    .filter((entry) => entry.sourceIds.every((id) => relatedIds.has(id)))
    .map((entry) => ({ entry, score: cosineSimilarity(embedding, entry.embedding) }))
    .sort((left, right) => right.score - left.score)
    .find((candidate) => candidate.score >= SEMANTIC_THRESHOLD);
  if (equivalent) {
    // Ghi nhớ cách hỏi mới để lần sau trúng ngay, và làm mốc so khớp cho các cách hỏi gần nó
    const { message, sourceChunks, sourceIds } = equivalent.entry;
    AnswerCache.updateOne({ ...filter, normalizedQuestion }, {
      $setOnInsert: { question: originalQuestion, constraints, embedding, message, sourceChunks, sourceIds },
    }, { upsert: true }).catch(() => console.error("Could not save ESH cache alias."));
    return cachedAnswer(equivalent.entry, "semantic");
  }

  const result = await generateAnswer(model, messages, sources);
  if (result.cacheable) {
    await AnswerCache.updateOne({ ...filter, normalizedQuestion }, { $set: {
      question: originalQuestion, constraints, embedding, message: result.message, sourceChunks: result.sourceChunks, sourceIds: result.sourceIds,
    } }, { upsert: true });
  }
  return { message: result.message, sourceChunks: result.sourceChunks, tokens: result.tokens, cache: { hit: false } };
}

async function callEshBot(messages, userId) {
  // Xếp hàng các câu tương đương (cùng tài khoản, hoặc cùng nhóm câu hỏi dùng chung) để chỉ gọi AI một lần
  const { queueKey } = cacheScope(messages, userId);
  const previous = userQueues.get(queueKey) || Promise.resolve();
  const current = previous.catch(() => {}).then(() => answerQuestion(messages, userId));
  userQueues.set(queueKey, current);
  let result;
  let failure;
  try {
    result = await current;
    return result;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (userQueues.get(queueKey) === current) userQueues.delete(queueKey);
    await ChatLog.create({ user: userId, question: messages.at(-1).content, sourceChunks: result?.sourceChunks || [], answer: result?.message || "", error: failure?.message || "", totalTokens: result?.tokens.total || 0 })
      .catch(() => console.error("Could not save ESH chat log."));
  }
}

module.exports = { callEshBot, coreQuestion, normalizeQuestion, questionConstraints, questionContextKey, validateAnswer };
