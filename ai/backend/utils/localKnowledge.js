const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chunkMarkdown } = require("../models/KnowledgeChunk");
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

function readKnowledge() {
  const files = fs.readdirSync(DOCS_DIR).filter((file) => /\.md$/i.test(file)).sort();
  const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : {};
  for (const reference of Object.values(manifest)) {
    const original = path.resolve(path.dirname(MANIFEST_PATH), reference.original);
    if (hash(fs.readFileSync(original)) !== reference.sourceSha256) {
      throw new Error("Tài liệu gốc đã đổi. Cần chạy lại scripts/buildKnowledgeReferences.py trước khi tư vấn.");
    }
    const referencedPdf = path.resolve(path.dirname(MANIFEST_PATH), reference.file);
    if (referencedPdf !== original && hash(fs.readFileSync(referencedPdf)) !== reference.referenceSha256) {
      throw new Error("Bản PDF tham chiếu đã đổi. Cần chuẩn bị lại knowledge base để xác minh số trang.");
    }
  }
  const documents = files.map((file) => {
    const text = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    if (!manifest[file] || hash(text) !== manifest[file].markdownSha256) {
      throw new Error("Knowledge base cần được chuẩn bị lại bằng scripts/buildKnowledgeReferences.py để xác minh số trang.");
    }
    return { file, text };
  });
  const version = hash(JSON.stringify({ documents, manifest, model: EMBEDDING_MODEL }));
  const chunks = documents.flatMap(({ file, text }) => parseDocument(file, text, manifest[file]));
  if (!chunks.length) throw new Error("Knowledge base ESH chưa có nội dung.");
  return { version, chunks, documentCount: files.length };
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
    indexPromise = buildIndex(knowledge).catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

function searchKnowledge(index, embedding, question = "", limit = 5) {
  const query = normalizeSearchText(question);
  const words = [...new Set(query.split(" ").filter((word) => word.length > 1))];
  const tuition = /hoc phi|phi hoc/.test(query);
  const requestedFeeDocument = /\bvce\b/.test(query) ? "bieu phi vce" : "bieu phi esh";
  const scored = index.chunks.map((chunk, position) => {
    const text = ` ${normalizeSearchText(chunk.text)} `;
    const overlap = words.filter((word) => text.includes(` ${word} `)).length / Math.max(words.length, 1);
    const feeBoost = tuition && normalizeSearchText(chunk.document).includes(requestedFeeDocument) ? 0.25 : 0;
    return { ...chunk, score: cosineSimilarity(embedding, index.vectors[position]) + 0.3 * overlap + feeBoost };
  }).sort((left, right) => right.score - left.score);
  const pages = new Map();
  for (const chunk of scored) {
    const id = chunk.page ? `${chunk.document}:page:${chunk.page}` : chunk.id;
    if (!pages.has(id)) pages.set(id, { ...chunk, id, text: chunk.pageText || chunk.text });
    if (pages.size === limit) break;
  }
  return [...pages.values()];
}

module.exports = { getKnowledgeIndex, searchKnowledge, parseDocument, hash, normalizeSearchText };
