const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument, getKnowledgeIndex, searchKnowledge } = require("../utils/localKnowledge");
const { coreQuestion, normalizeQuestion, questionConstraints, questionContextKey, validateAnswer, callEshBot } = require("../utils/eshBot");
const AnswerCache = require("../models/EshAnswerCache");
const ChatLog = require("../models/ChatLog");
const { embedTexts } = require("../utils/localEmbeddings");
const { NO_INFO_ANSWER } = require("../utils/prompts");

test("chunks keep the correct document and page across subheadings", () => {
  const chunks = parseDocument("fees.md", "## Fees — Trang 1\n\nLớp 1 đóng 12 triệu.\n### Ghi chú\nĐóng theo tháng.\n## Fees — Trang 2\n\nLớp 9 đóng 25 triệu.", { file: "sources/fees.pdf" });
  assert.equal(chunks.find((chunk) => chunk.text.includes("Lớp 1")).page, 1);
  assert.equal(chunks.find((chunk) => chunk.text.includes("Đóng theo tháng")).page, 1);
  assert.equal(chunks.find((chunk) => chunk.text.includes("Lớp 9")).page, 2);
  assert.ok(chunks.every((chunk) => chunk.label.includes("fees.pdf")));
});

test("reference editions are labelled and unpaged text never invents a page", () => {
  assert.match(parseDocument("intro.md", "## Intro — Trang 2\n\nGiới thiệu trường.", { file: "reference-pdfs/intro.pdf", referenceEdition: true })[0].label, /trang 2 \(bản PDF tham chiếu\)/);
  assert.equal(parseDocument("intro.md", "Giới thiệu trường.")[0].page, null);
});

test("paraphrases can share a context while follow-ups retain previous conversation", () => {
  const first = [{ role: "user", content: "Trường ESH có những chương trình học nào?" }];
  const next = [...first, { role: "assistant", content: "Thông tin tham khảo." }, { role: "user", content: "ESH đào tạo những chương trình gì?" }];
  assert.equal(questionContextKey(first), questionContextKey(next));
  const followUp = [{ role: "user", content: "Còn lớp đó thì sao?" }];
  assert.notEqual(questionContextKey(followUp), questionContextKey([...first, ...followUp]));
});

test("different grades, years, programs, periods and negations never share a cache constraint", () => {
  const pairs = [
    ["Học phí lớp 1 bao nhiêu?", "Học phí lớp 2 bao nhiêu?"],
    ["Học phí ESH năm 2025-2026?", "Học phí ESH năm 2026-2027?"],
    ["Học phí VCE lớp 10?", "Học phí MOET lớp 10?"],
    ["Học phí mỗi tháng bao nhiêu?", "Học phí mỗi kỳ bao nhiêu?"],
    ["Nhà trường có hoàn học phí?", "Trường hợp nào không hoàn học phí?"],
    ["Trường ESH có hồ bơi không?", "Trường ESH có thư viện không?"],
    ["Học phí lớp một tại ESH?", "Học phí lớp hai tại ESH?"],
    ["Trường ESH có phí ăn không?", "Trường ESH có phí ẩn không?"],
  ];
  for (const [left, right] of pairs) assert.notEqual(questionConstraints(left), questionConstraints(right));
  assert.equal(questionConstraints("Trường ESH có những chương trình học nào?"), questionConstraints("ESH đào tạo những chương trình gì?"));
});

test("citations must quote an existing supplied source and use known markers", () => {
  const sources = [{ id: "fees:1:0", label: "fees.pdf — trang 1", text: "Học phí lớp 1 là 12 triệu đồng mỗi tháng." }];
  const valid = { answer: "Học phí lớp 1 là 12 triệu đồng mỗi tháng [S1].", citations: [{ sourceId: "S1", quote: "Học phí lớp 1 là 12 triệu đồng mỗi tháng." }] };
  const answer = validateAnswer(valid, sources);
  // Nguồn chỉ nằm ở sourceChunks (mục "Nguồn thông tin"), không lặp lại trong nội dung trả lời
  assert.equal(answer.message, valid.answer);
  assert.doesNotMatch(answer.message, /Nguồn tham khảo/);
  assert.match(answer.sourceChunks[0], /fees.pdf — trang 1/);
  assert.deepEqual(answer.sourceIds, ["fees:1:0"]);
  assert.throws(() => validateAnswer({ ...valid, citations: [{ sourceId: "S8", quote: valid.citations[0].quote }] }, sources));
  assert.throws(() => validateAnswer({ ...valid, citations: [{ sourceId: "S1", quote: "Học phí là 99 triệu đồng mỗi tháng." }] }, sources));
  assert.throws(() => validateAnswer({ ...valid, answer: "Học phí lớp 1 là 12 triệu đồng [S2]." }, sources));
});

test("citation check tolerates formatting differences but not changed wording", () => {
  const sources = [{ id: "intro:8", label: "intro.pdf — trang 8", text: "## Chương trình\n| **Chương trình Việt Nam** | dạy theo “chuẩn” Bộ GD–ĐT |\nHọc sinh được học tiếng Anh tăng cường mỗi tuần." }];
  const cite = (quote) => validateAnswer({ answer: "ESH dạy chương trình Việt Nam [S1].", citations: [{ sourceId: "S1", quote }] }, sources);
  assert.doesNotThrow(() => cite("Chương trình Việt Nam dạy theo \"chuẩn\" Bộ GD-ĐT"));
  assert.doesNotThrow(() => cite("Chương trình Việt Nam ... Học sinh được học tiếng Anh tăng cường"));
  assert.throws(() => cite("Chương trình Việt Nam dạy theo chuẩn quốc tế"));
  assert.throws(() => cite("Học sinh được học tiếng Anh tăng cường ... Chương trình Việt Nam")); // sai thứ tự
  assert.throws(() => cite("Chương trình ... Anh")); // đoạn quá ngắn
});

test("uncited factual answers are replaced and are not cached", () => {
  const result = validateAnswer({ answer: "Trường miễn toàn bộ học phí.", citations: [] }, []);
  assert.equal(result.message, NO_INFO_ANSWER);
  assert.equal(result.cacheable, false);
  assert.equal(normalizeQuestion("  HỌC PHÍ LỚP 1? "), "học phí lớp 1");
  assert.notEqual(normalizeQuestion("phí ăn"), normalizeQuestion("phí ẩn"));
});

test("an exact cache hit returns the saved answer with zero API calls and zero tokens", async (t) => {
  let calls = 0;
  t.mock.method(global, "fetch", async () => { calls += 1; throw new Error("External calls are forbidden in cache tests"); });
  t.mock.method(AnswerCache, "findOne", () => ({ lean: async () => ({ message: "Câu trả lời đã lưu [S1].", sourceChunks: ["Nguồn đã lưu"] }) }));
  t.mock.method(ChatLog, "create", async () => ({}));
  const answer = await callEshBot([{ role: "user", content: "Trường ESH có những chương trình học nào?" }], "507f1f77bcf86cd799439011");
  assert.equal(answer.message, "Câu trả lời đã lưu [S1].");
  assert.deepEqual(answer.tokens, { input: 0, output: 0, total: 0 });
  assert.equal(answer.cache.match, "exact");
  assert.equal(calls, 0);
});

test("a Vietnamese paraphrase reuses the cached answer without contacting an AI", async (t) => {
  const question = "ESH đào tạo những chương trình gì?";
  const original = "Trường ESH có những chương trình học nào?";
  const index = await getKnowledgeIndex();
  const [queryVector, storedVector] = await embedTexts([question, original]);
  const sources = searchKnowledge(index, queryVector, question);
  let calls = 0;
  t.mock.method(global, "fetch", async () => { calls += 1; throw new Error("External calls are forbidden in cache tests"); });
  t.mock.method(AnswerCache, "findOne", () => ({ lean: async () => null }));
  t.mock.method(AnswerCache, "find", () => ({ lean: async () => [{ embedding: storedVector, sourceIds: [sources[0].id], message: "Cùng câu trả lời đã lưu [S1].", sourceChunks: ["Nguồn đã lưu"] }] }));
  t.mock.method(AnswerCache, "updateOne", async () => ({}));
  t.mock.method(ChatLog, "create", async () => ({}));
  const answer = await callEshBot([{ role: "user", content: question }], "507f1f77bcf86cd799439011");
  assert.equal(answer.message, "Cùng câu trả lời đã lưu [S1].");
  assert.equal(answer.cache.match, "semantic");
  assert.equal(answer.tokens.total, 0);
  assert.equal(calls, 0);
});

test("standalone questions share one cache across users; follow-ups stay per user; model changes invalidate", async (t) => {
  const lookups = [];
  t.mock.method(AnswerCache, "findOne", (filter) => {
    lookups.push(filter);
    return { lean: async () => ({ message: "Saved.", sourceChunks: [] }) };
  });
  t.mock.method(ChatLog, "create", async () => ({}));
  const standalone = [{ role: "user", content: "Trường ESH có những chương trình học nào?" }];
  const followUp = [...standalone, { role: "assistant", content: "Có chương trình A." }, { role: "user", content: "Còn lớp đó thì sao?" }];
  const previousModel = process.env.GEMINI_MODEL;
  try {
    process.env.GEMINI_MODEL = "model-before";
    await callEshBot(standalone, "507f1f77bcf86cd799439011");
    await callEshBot(standalone, "507f1f77bcf86cd799439012");
    await callEshBot(followUp, "507f1f77bcf86cd799439011");
    await callEshBot(followUp, "507f1f77bcf86cd799439012");
    process.env.GEMINI_MODEL = "model-after";
    await callEshBot(standalone, "507f1f77bcf86cd799439011");
  } finally {
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  }
  assert.equal(lookups[0].user, null);
  assert.deepEqual(lookups[0], lookups[1]); // hai tài khoản cùng tra một mục cache chung
  assert.notEqual(String(lookups[2].user), String(lookups[3].user));
  assert.notEqual(lookups[0].namespace, lookups[4].namespace);
});

test("polite filler words do not change the cache key", () => {
  assert.equal(coreQuestion("Dạ cho em hỏi trường ESH có những chương trình học nào ạ?"), "trường ESH có những chương trình học nào?");
  assert.equal(coreQuestion("Cho mình hỏi là ESH dạy những chương trình gì vậy?"), "ESH dạy những chương trình gì?");
  assert.equal(coreQuestion("Xin hỏi học phí lớp 1?"), "học phí lớp 1?");
  assert.equal(coreQuestion("ạ"), "ạ");
});

test("paraphrases from different users reuse one shared answer and remember the new wording", async (t) => {
  const rows = [];
  let calls = 0;
  t.mock.method(AnswerCache, "findOne", (filter) => ({
    lean: async () => rows.find((row) => row.user === filter.user && row.normalizedQuestion === filter.normalizedQuestion) || null,
  }));
  t.mock.method(AnswerCache, "find", (filter) => ({
    lean: async () => rows.filter((row) => row.user === filter.user && row.constraints === filter.constraints),
  }));
  t.mock.method(AnswerCache, "updateOne", async (filter, update) => {
    if (!rows.some((row) => row.user === filter.user && row.normalizedQuestion === filter.normalizedQuestion)) {
      rows.push({ ...filter, ...(update.$set || update.$setOnInsert) });
    }
  });
  t.mock.method(ChatLog, "create", async () => ({}));
  t.mock.method(global, "fetch", async (_url, options) => {
    calls += 1;
    const prompt = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
    const source = prompt.knowledgeBase[0];
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          answer: "ESH có nhiều chương trình [S1].",
          citations: [{ sourceId: source.sourceId, quote: source.text.slice(0, 100) }],
        }) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      }),
    };
  });
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "synthetic-test-key-never-sent";
  try {
    const first = await callEshBot([{ role: "user", content: "Trường ESH có những chương trình học nào?" }], "507f1f77bcf86cd799439021");
    const second = await callEshBot([{ role: "user", content: "ESH dạy những chương trình gì?" }], "507f1f77bcf86cd799439022");
    const third = await callEshBot([{ role: "user", content: "Dạ cho em hỏi trường ESH có những chương trình học nào ạ?" }], "507f1f77bcf86cd799439023");
    assert.equal(calls, 1);
    assert.equal(first.cache.hit, false);
    assert.equal(second.cache.match, "semantic");
    assert.equal(third.cache.match, "exact");
    assert.equal(second.message, first.message);
    assert.equal(second.tokens.total, 0);
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(rows.some((row) => row.normalizedQuestion === "esh dạy những chương trình gì"), "cách hỏi mới được ghi nhớ");
    assert.ok(rows.every((row) => row.user === null));
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("simultaneous equivalent questions generate one answer and reuse it", async (t) => {
  const rows = [];
  let calls = 0;
  t.mock.method(AnswerCache, "findOne", (filter) => ({
    lean: async () => rows.find((row) => row.normalizedQuestion === filter.normalizedQuestion) || null,
  }));
  t.mock.method(AnswerCache, "find", (filter) => ({
    lean: async () => rows.filter((row) => row.constraints === filter.constraints),
  }));
  t.mock.method(AnswerCache, "updateOne", async (filter, update) => {
    rows.push({ ...filter, ...update.$set });
  });
  t.mock.method(ChatLog, "create", async () => ({}));
  t.mock.method(global, "fetch", async (_url, options) => {
    calls += 1;
    const request = JSON.parse(options.body);
    const prompt = JSON.parse(request.contents[0].parts[0].text);
    const source = prompt.knowledgeBase[0];
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          answer: "Thông tin chương trình nằm trong tài liệu nguồn [S1].",
          citations: [{ sourceId: source.sourceId, quote: source.text.slice(0, 100) }],
        }) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      }),
    };
  });
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "synthetic-test-key-never-sent";
  try {
    const [first, second] = await Promise.all([
      callEshBot([{ role: "user", content: "Trường ESH có những chương trình học nào?" }], "507f1f77bcf86cd799439013"),
      callEshBot([{ role: "user", content: "ESH đào tạo những chương trình gì?" }], "507f1f77bcf86cd799439013"),
    ]);
    assert.equal(calls, 1);
    assert.equal(first.message, second.message);
    assert.equal(second.cache.hit, true);
    assert.equal(second.tokens.total, 0);
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("a temporary Gemini overload is retried once, then reported in Vietnamese", async (t) => {
  let calls = 0;
  t.mock.method(AnswerCache, "findOne", () => ({ lean: async () => null }));
  t.mock.method(AnswerCache, "find", () => ({ lean: async () => [] }));
  t.mock.method(ChatLog, "create", async () => ({}));
  t.mock.method(global, "fetch", async () => {
    calls += 1;
    return { ok: false, status: 503, json: async () => ({ error: { message: "This model is currently experiencing high demand." } }) };
  });
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "synthetic-test-key-never-sent";
  try {
    await assert.rejects(
      callEshBot([{ role: "user", content: "Học phí lớp 3 tại ESH là bao nhiêu?" }], "507f1f77bcf86cd799439031"),
      (error) => error.status === 429 && /quá tải/.test(error.message),
    );
    assert.equal(calls, 2);
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
