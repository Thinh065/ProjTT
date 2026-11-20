const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chunkMarkdown } = require("./chunkMarkdown");
const { embedTexts, cosineSimilarity, EMBEDDING_MODEL } = require("./localEmbeddings");

const DOCS_DIR = path.resolve(process.env.CHUNKS_DIR || process.env.DOCS_DIR || path.join(__dirname, "../knowledgeBase/chunks"));
const MANIFEST_PATH = path.join(__dirname, "../knowledgeBase/manifest.json");
const INDEX_PATH = path.join(__dirname, "../.cache/knowledge-index.json");
let indexPromise;
let activeVersion;

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizeSearchText = (text) => String(text).toLowerCase().normalize("NFD")
  .replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/[^a-z0-9%+\-]+/g, " ").trim()
  .replace(/\b(lop|khoi) (muoi hai|muoi mot|muoi|mot|hai|ba|bon|nam|sau|bay|tam|chin)\b/g, (_, level, number) => {
    const grades = { mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10, "muoi mot": 11, "muoi hai": 12 };
    return `${level} ${grades[number]}`;
  });

function parseDocument(file, text, reference = {}) {
  const pages = text.split(/(?=^## .+ — Trang \d+\s*$)/m).filter((page) => page.trim());
  return pages.flatMap((pageText, pageIndex) => {
    const marker = pageText.match(/^## (.+) — Trang (\d+)\s*$/m);
    const page = marker ? Number(marker[2]) : null;
    const document = reference.file || file;
    return chunkMarkdown(pageText).map((content, chunkIndex) => ({
      id: `${file}:${pageIndex}:${chunkIndex}`,
      document,
      page,
      text: content,
      pageText,
      label: page
        ? `${path.basename(document)} — trang ${page}${reference.referenceEdition ? " (bản PDF tham chiếu)" : ""}`
        : `${file} — ${content.split("\n", 1)[0].replace(/^#+\s*/, "").slice(0, 100)} (chưa có số trang)`,
    }));
  });
}

// readKnowledge được gọi ở mỗi câu hỏi. Đọc + băm lại ~9 MB tài liệu gốc mất ~100 ms và chặn cả server,
// nên giữ kết quả trong bộ nhớ và chỉ đọc lại khi kích thước/ngày sửa của một file liên quan thay đổi.
let knowledgeCache = null; // { fingerprint, knowledge, watchedFiles }
const listMarkdown = () => fs.readdirSync(DOCS_DIR).filter((file) => /\.md$/i.test(file)).sort();
function fileStamp(file) {
  try {
    const stat = fs.statSync(file);
    return `${stat.size}:${stat.mtimeMs}`;
  } catch {
    return "missing";
  }
}
const knowledgeFingerprint = (watchedFiles) => [
  ...listMarkdown().map((file) => `${file}=${fileStamp(path.join(DOCS_DIR, file))}`),
  `manifest=${fileStamp(MANIFEST_PATH)}`,
  ...watchedFiles.map((file) => `${file}=${fileStamp(file)}`),
].join("|");

function readKnowledge() {
  if (knowledgeCache && knowledgeFingerprint(knowledgeCache.watchedFiles) === knowledgeCache.fingerprint) {
    return knowledgeCache.knowledge;
  }
  const { knowledge, watchedFiles } = loadKnowledge();
  knowledgeCache = { knowledge, watchedFiles, fingerprint: knowledgeFingerprint(watchedFiles) };
  return knowledge;
}

function loadKnowledge() {
  const files = listMarkdown();
  const watchedFiles = [];
  const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : {};
  for (const reference of Object.values(manifest)) {
    const original = path.resolve(path.dirname(MANIFEST_PATH), reference.original);
    watchedFiles.push(original);
    if (hash(fs.readFileSync(original)) !== reference.sourceSha256) {
      throw new Error("Tài liệu gốc đã đổi. Cần chạy lại scripts/buildKnowledgeReferences.py trước khi tư vấn.");
    }
    const referencedPdf = path.resolve(path.dirname(MANIFEST_PATH), reference.file);
    if (referencedPdf !== original) watchedFiles.push(referencedPdf);
    if (referencedPdf !== original && hash(fs.readFileSync(referencedPdf)) !== reference.referenceSha256) {
      throw new Error("Bản PDF tham chiếu đã đổi. Cần chuẩn bị lại knowledge base để xác minh số trang.");
    }
  }
  const documents = files.map((file) => {
    const text = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    // Băm theo xuống dòng LF: git trên Windows (core.autocrlf) checkout ra CRLF, Linux/Docker/CI giữ LF
    if (!manifest[file] || hash(text.replace(/\r\n/g, "\n")) !== manifest[file].markdownSha256) {
      throw new Error("Knowledge base cần được chuẩn bị lại bằng scripts/buildKnowledgeReferences.py để xác minh số trang.");
    }
    return { file, text };
  });
  const version = hash(JSON.stringify({ documents, manifest, model: EMBEDDING_MODEL }));
  const parsed = documents.map(({ file, text }) => ({ file, chunks: parseDocument(file, text, manifest[file]) }));
  // Tính sẵn phần chữ đã chuẩn hóa dùng khi tìm kiếm (trước đây tính lại cho cả 264 đoạn ở mỗi câu hỏi)
  const chunks = parsed.flatMap((doc) => doc.chunks).map((chunk) => ({
    ...chunk,
    searchText: ` ${normalizeSearchText(chunk.text)} `,
    searchTitle: documentTitle(chunk.document),
    amountCount: (chunk.text.match(MONEY_AMOUNT) || []).length,
  }));
  if (!chunks.length) throw new Error("Knowledge base ESH chưa có nội dung.");
  const docStats = parsed.map(({ file, chunks: docChunks }) => ({
    file,
    referenceFile: manifest[file]?.file || file,
    pageCount: new Set(docChunks.map((c) => c.page).filter(Boolean)).size,
    chunkCount: docChunks.length,
  }));
  return { knowledge: { version, chunks, documentCount: files.length, documents: docStats }, watchedFiles };
}

// Phiên bản index đã nạp xong trong bộ nhớ (để trang quản trị khỏi đọc lại file index 2 MB)
let readyIndexVersion = null;

function getKnowledgeSummary() {
  const knowledge = readKnowledge();
  let indexCached = readyIndexVersion === knowledge.version;
  if (!indexCached) {
    try {
      const saved = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
      indexCached = saved?.version === knowledge.version && saved.vectors?.length === knowledge.chunks.length;
    } catch {
      indexCached = false;
    }
  }
  return {
    version: knowledge.version.slice(0, 12),
    embeddingModel: EMBEDDING_MODEL,
    documentCount: knowledge.documentCount,
    chunkCount: knowledge.chunks.length,
    indexCached,
    documents: knowledge.documents,
  };
}

async function buildIndex(knowledge) {
  let saved;
  try { saved = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); } catch { /* First build or incomplete cache. */ }
  if (saved?.version === knowledge.version && saved.vectors?.length === knowledge.chunks.length) {
    return { ...knowledge, vectors: saved.vectors };
  }
  const vectors = [];
  for (let offset = 0; offset < knowledge.chunks.length; offset += 8) {
    vectors.push(...await embedTexts(knowledge.chunks.slice(offset, offset + 8).map((chunk) => chunk.text)));
  }
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  const temporaryPath = `${INDEX_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ version: knowledge.version, vectors }));
  fs.renameSync(temporaryPath, INDEX_PATH);
  return { ...knowledge, vectors };
}

async function getKnowledgeIndex() {
  const knowledge = readKnowledge();
  if (!indexPromise || activeVersion !== knowledge.version) {
    activeVersion = knowledge.version;
    indexPromise = buildIndex(knowledge).then((index) => {
      readyIndexVersion = index.version;
      return index;
    }, (error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

// Số tiền dạng "12,210,000" / "24.300.000"
const MONEY_AMOUNT = /\b\d{1,3}(?:[.,]\d{3}){2,}\b/g;
// Tên tài liệu dạng chữ thường không dấu, gạch ngang đổi thành khoảng trắng ("sources/Bieu-phi-ESH-…pdf" → "bieu phi esh …")
const documentTitle = (document) => normalizeSearchText(path.basename(document, path.extname(document))).replace(/-/g, " ");
// Từ chung có mặt ở nhiều tên tài liệu, không giúp phân biệt tài liệu nào
const COMMON_TITLE_WORDS = new Set(["esh", "nam", "hoc", "bieu", "phi", "truong"]);
const titleKeywords = (title) => title.split(" ").filter((word) => word.length > 1 && !/^\d+$/.test(word) && !COMMON_TITLE_WORDS.has(word));

// Câu hỏi tiếng Anh: thêm từ tiếng Việt tương ứng để so khớp với tài liệu (toàn bộ bằng tiếng Việt)
const ENGLISH_TERMS = [
  [/\btuition\b/, "hoc phi"], [/\bfees?\b/, "phi"], [/\bgrades?\b|\bclass\b/, "lop"],
  [/\bhow much\b|\bcosts?\b|\bprices?\b/, "bao nhieu"], [/\bscholarships?\b/, "hoc bong"],
  [/\brefunds?\b/, "hoan hoc phi"], [/\bmeals?\b|\blunch\b/, "tien an"], [/\bbus\b|\btransport/, "xe bus"],
  [/\badmissions?\b|\benrol+(?:ment)?\b/, "tuyen sinh ho so"], [/\bteachers?\b/, "giao vien"],
];
const expandQuery = (query) => [query, ...ENGLISH_TERMS.filter(([pattern]) => pattern.test(query)).map(([, vi]) => vi)].join(" ");

// Chủ đề không nằm trong tên tài liệu → tài liệu chứa nội dung đó ("học bổng" nằm trong tài liệu tuyển sinh,
// còn các biểu phí chỉ có cột "ưu đãi học bổng" nên dễ lấn át)
const TOPIC_DOCUMENTS = [
  [/\bhoc bong\b/, "tuyen sinh esh"],
  [/\b(?:nhap hoc|ho so|dang ky|xet tuyen)\b/, "tuyen sinh esh"],
  [/\b(?:giao vien|thay co|bang cap)\b/, "doi ngu giao vien"],
  [/\b(?:lo trinh|cap hoc|bac hoc)\b/, "lo trinh hoc"],
  [/\b(?:ngoai khoa|sel|tinh cach|ky nang|suc khoe tinh than)\b/, "chuong trinh bo tro"],
];

// Câu hỏi về một loại phí → tài liệu biểu phí tương ứng (một câu có thể hỏi nhiều loại)
function requestedFeeDocuments(query) {
  const documents = [];
  if (/hoc phi|phi hoc/.test(query)) documents.push(/\bvce\b/.test(query) ? "bieu phi vce" : "bieu phi esh");
  if (/\b(?:xe|bus|dua don|dua ruoc)\b/.test(query)) documents.push("bieu phi xe bus");
  if (/\b(?:tien an|phi an|bua an|an trua|an sang|an ban tru|suat an)\b/.test(query)) {
    documents.push(/\bvce\b/.test(query) ? "vce bieu phi an" : /\bcvk\b/.test(query) ? "esh cvk bieu phi an" : "esh bieu phi an");
  }
  return documents;
}

function searchKnowledge(index, embedding, question = "", limit = 5) {
  const query = expandQuery(normalizeSearchText(question));
  const words = [...new Set(query.split(" ").filter((word) => word.length > 1))];
  const queryWords = new Set(query.split(" "));
  const feeDocuments = requestedFeeDocuments(query);
  const topicDocuments = TOPIC_DOCUMENTS.filter(([pattern]) => pattern.test(query)).map(([, name]) => name);
  // Chỉ đưa bảng giá lên đầu khi người hỏi muốn biết số tiền — không phải "hoàn học phí như thế nào"
  // hay "nghỉ học thì được hoàn bao nhiêu" (hỏi về chính sách hoàn/bảo lưu, không phải bảng giá)
  const asksAmount = /bao nhieu|muc phi|muc hoc phi|chi phi|so tien|\bgia\b|het bao|tong cong|\bphi\b.*\blop \d+/.test(query)
    && !/\b(?:hoan|bao luu|thoi hoc|nghi hoc|chuyen phi|chuyen hoc phi|chuyen truong)\b/.test(query);
  const scored = index.chunks.map((chunk, position) => {
    // searchText/searchTitle/amountCount được tính sẵn trong readKnowledge (chunk tự tạo thì tính tại đây)
    const text = chunk.searchText ?? ` ${normalizeSearchText(chunk.text)} `;
    const overlap = words.filter((word) => text.includes(` ${word} `)).length / Math.max(words.length, 1);
    const title = chunk.searchTitle ?? documentTitle(chunk.document);
    // Câu hỏi chứa đủ các từ đặc trưng của tên tài liệu ("hồ sơ tuyển sinh" ↔ "Tuyen sinh ESH",
    // "chương trình bổ trợ" ↔ "4 - Chương trình bổ trợ") thì ưu tiên tài liệu đó
    const keywords = titleKeywords(title);
    const titleBoost = (keywords.length >= 2 && keywords.every((word) => queryWords.has(word)))
      || topicDocuments.some((name) => title.includes(name)) ? 0.3 : 0;
    const feeDocument = feeDocuments.some((name) => title.includes(name));
    // Các dòng của bảng giá ("2  13,920,000  9,744,000 ...") bị cắt rời khỏi tiêu đề "Mức học phí" và
    // gần như chỉ có số, nên điểm ngữ nghĩa rất thấp. Khi hỏi số tiền, đoạn chứa nhiều số tiền trong đúng
    // biểu phí được hỏi luôn được đưa lên đầu, để Gemini thấy bảng giá của mọi khối lớp.
    const amounts = feeDocument && asksAmount ? chunk.amountCount ?? (chunk.text.match(MONEY_AMOUNT) || []).length : 0;
    const feeBoost = feeDocument ? 0.25 + (amounts >= 5 ? 1 : 0) : 0;
    return { chunk, score: cosineSimilarity(embedding, index.vectors[position]) + 0.3 * overlap + titleBoost + feeBoost };
  }).sort((left, right) => right.score - left.score);
  const pages = new Map();
  for (const { chunk, score } of scored) {
    const id = chunk.page ? `${chunk.document}:page:${chunk.page}` : chunk.id;
    if (!pages.has(id)) {
      const { searchText, searchTitle, amountCount, ...rest } = chunk;
      pages.set(id, { ...rest, id, score, text: chunk.pageText || chunk.text });
    }
    if (pages.size === limit) break;
  }
  return [...pages.values()];
}

module.exports = { getKnowledgeIndex, getKnowledgeSummary, searchKnowledge, parseDocument, hash, normalizeSearchText };
