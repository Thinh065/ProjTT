const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { CloudClient } = require("chromadb");
const { HfInference } = require("@huggingface/inference");

// Tải biến môi trường từ .env (khi chạy file này trực tiếp)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Thư mục chứa các file .md của knowledge base
const DOCS_DIR = path.resolve(
  process.env.CHUNKS_DIR || process.env.DOCS_DIR || path.join(__dirname, "../knowledgeBase/chunks")
);

const EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const COLLECTION_NAME = "knowledge_chunks";
const CHUNK_SIZE = 1200;

let inference;
let collectionPromise;

// Khởi tạo lazy: chỉ kết nối Chroma/HF khi thật sự cần
function getCollection() {
  if (!collectionPromise) {
    if (!process.env.CHROMA_API_KEY) {
      return Promise.reject(new Error("Chưa cấu hình CHROMA_API_KEY"));
    }
    const client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });
    collectionPromise = client
      .getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { description: "ESH knowledge base chunks" },
      })
      .catch((err) => {
        collectionPromise = null; // cho phép thử lại lần sau
        throw err;
      });
  }
  return collectionPromise;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const waitTime = Math.min(1000 * 2 ** attempt, 10000);
      console.log(`Retry ${attempt}/${maxRetries} after ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
}

// Lấy embedding từ Hugging Face
async function getEmbedding(text) {
  if (!inference) inference = new HfInference(process.env.HF_TOKEN);
  const cleanText = text.trim().replace(/\s+/g, " ").slice(0, 2000);
  return retryWithBackoff(() =>
    inference.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: cleanText,
      options: { wait_for_model: true, use_cache: true },
    })
  );
}

// Chia Markdown theo heading ##/###, mỗi phần cắt thành các đoạn ~1200 ký tự (có lặp lại heading)
function chunkMarkdown(text) {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\[cite_start\]|\[cite:[^\]]*\]/g, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const sections = clean.split(/\n(?=#{2,3} )/);
  const chunks = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split("\n", 1)[0];
    const heading = /^#{2,3} /.test(firstLine) ? firstLine : "";
    const body = heading ? trimmed.slice(firstLine.length).trim() : trimmed;

    if (!body) {
      if (heading) chunks.push(heading);
      continue;
    }

    const budget = Math.max(200, CHUNK_SIZE - heading.length - 1);
    for (let i = 0; i < body.length; i += budget) {
      const piece = body.slice(i, i + budget).trim();
      if (piece) chunks.push(heading ? `${heading}\n${piece}` : piece);
    }
  }
  return chunks;
}

const normalizeFileName = (file) => file.replace(/\.md$/i, "");

async function isFileChunked(collection, fileId) {
  const expectedChunkId = `${fileId}-chunk-0`;
  try {
    const result = await collection.get({ ids: [expectedChunkId] });
    return result.ids.includes(expectedChunkId);
  } catch {
    return false;
  }
}

// Đọc các file .md trong DOCS_DIR và lưu vào ChromaDB (bỏ qua file đã xử lý)
async function extractAndSaveMdFiles() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.warn(`⚠️ Không tìm thấy thư mục knowledge base: ${DOCS_DIR} (đặt CHUNKS_DIR trong .env)`);
    return;
  }

  const collection = await getCollection();
  const files = fs.readdirSync(DOCS_DIR).filter((file) => file.toLowerCase().endsWith(".md"));

  for (const file of files) {
    const fileId = normalizeFileName(file);
    if (await isFileChunked(collection, fileId)) {
      console.log(`⏩ File ${file} đã được chunk, bỏ qua.`);
      continue;
    }

    console.log(`\n📝 Processing file: ${file}`);
    const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    const chunks = chunkMarkdown(content);
    console.log(`🔄 Created ${chunks.length} chunks from file ${file}`);

    for (let i = 0; i < chunks.length; i += 10) {
      const batchChunks = chunks.slice(i, i + 10);
      const ids = batchChunks.map((_, index) => `${fileId}-chunk-${i + index}`);
      const embeddings = await Promise.all(batchChunks.map((chunk) => getEmbedding(chunk)));

      await collection.add({
        ids,
        embeddings,
        metadatas: batchChunks.map((chunk) => ({
          file: fileId,
          chunkSize: chunk.split(/\s+/).length,
        })),
        documents: batchChunks,
      });

      console.log(`✅ Saved chunks ${i + 1} to ${i + batchChunks.length}`);
      await delay(1000);
    }
    console.log(`🎯 Đã hoàn tất xử lý file: ${file}`);
  }
}

// Fallback: tìm theo từ khoá
function keywordSearch(query, documents, limit = 3) {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  return documents
    .map((doc) => {
      const lower = String(doc).toLowerCase();
      return { doc, score: queryWords.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc);
}

async function keywordFallback(collection, query, limit) {
  try {
    const allDocs = await collection.get({ limit: 1000 });
    return keywordSearch(query, (allDocs.documents || []).filter(Boolean), limit);
  } catch (err) {
    console.error("❌ Keyword fallback error:", err.message);
    return [];
  }
}

// Tìm các chunk liên quan; lỗi embedding thì quay về tìm theo từ khoá
async function searchSimilarChunks(query, limit = 3) {
  const collection = await getCollection();
  try {
    const queryEmbedding = await getEmbedding(query);
    const results = await collection.query({ queryEmbeddings: [queryEmbedding], nResults: limit });
    const docs = (results.documents?.flat() || []).filter(Boolean);
    if (docs.length > 0) return docs;
    console.log("⚠️ No embedding match, fallback to keyword search...");
  } catch (err) {
    console.error("❌ Embedding search error, using fallback:", err.message);
  }
  return keywordFallback(collection, query, limit);
}

if (require.main === module) {
  extractAndSaveMdFiles().catch((err) => {
    console.error("❌ Critical error:", err);
    process.exit(1);
  });
}

module.exports = { extractAndSaveMdFiles, searchSimilarChunks, chunkMarkdown };
