const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { CloudClient } = require("chromadb");
const fetch = require("node-fetch");
const { HfInference } = require("@huggingface/inference");

// Đường dẫn thư mục chứa file .md
const DOCS_DIR = "C:/Code/ProjCT/knowledgeBase/chunks";

// Tải biến môi trường từ .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const inference = new HfInference(process.env.HF_TOKEN);

// Khởi tạo ChromaDB client và collection
const chromaClient = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE
});

let collection;
async function initChroma() {
  collection = await chromaClient.getOrCreateCollection({
    name: "knowledge_chunks",
    metadata: { description: "ESH knowledge base chunks" }
  });
}

// Delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Retry with backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries === maxRetries) throw error;
      const waitTime = Math.min(1000 * Math.pow(2, retries), 10000);
      console.log(`Retry ${retries}/${maxRetries} after ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
}

// 📌 Lấy embedding từ Hugging Face
async function getEmbedding(text) {
  const cleanText = text.trim().replace(/\s+/g, " ").slice(0, 2000);
  const result = await retryWithBackoff(() =>
    inference.featureExtraction({
      model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      inputs: cleanText,
      options: { wait_for_model: true, use_cache: true }
    })
  );
  return result;
}

// 📌 Chuẩn hóa và chunk Markdown
function chunkMarkdown(text) {
  // Xóa cite và ký hiệu không cần thiết
  let clean = text
    .replace(/\[cite_start\]|\[cite:.*?\]/g, "")
    .replace(/---/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Cắt theo heading ## hoặc ###
  const sections = clean.split(/\n(?=## )/);

  const chunks = [];
  for (const section of sections) {
    if (!section.trim()) continue;

    // Giữ heading trong chunk
    const headingMatch = section.match(/^##.*$/m);
    const heading = headingMatch ? headingMatch[0] + "\n" : "";

    // Cắt thành subchunks 1200 ký tự
    const subChunks = section.match(/[\s\S]{1,1200}/g);
    if (subChunks) {
      for (const sub of subChunks) {
        chunks.push((heading + sub).trim());
      }
    }
  }
  return chunks;
}

// Chuẩn hoá tên file (loại bỏ .md)
function normalizeFileName(file) {
  return file.replace(/\.md$/i, "");
}

// Kiểm tra file đã chunk chưa
async function isFileChunked(file) {
  await initChroma();
  const fileId = normalizeFileName(file);
  const expectedChunkId = `${fileId}-chunk-0`;

  try {
    const result = await collection.get({ ids: [expectedChunkId] });
    return result.ids.includes(expectedChunkId);
  } catch {
    return false;
  }
}

// 👉 Hàm xử lý file Markdown
async function extractAndSaveMdFiles() {
  try {
    await initChroma();

    const files = fs
      .readdirSync(DOCS_DIR)
      .filter(file => file.endsWith(".md"));

    for (const file of files) {
      const fileId = normalizeFileName(file);
      if (await isFileChunked(file)) {
        console.log(`⏩ [ĐÃ XỬ LÝ] File ${file} đã được chunk, bỏ qua.`);
        continue;
      }

      console.log(`\n📝 Processing file: ${file}`);
      const filePath = path.join(DOCS_DIR, file);
      const content = fs.readFileSync(filePath, "utf8");

      // Dùng chunkMarkdown thay cho chunkTextBySentence
      const chunks = chunkMarkdown(content);
      console.log(`🔄 Created ${chunks.length} chunks from file ${file}`);

      for (let i = 0; i < chunks.length; i += 10) {
        const batchChunks = chunks.slice(i, i + 10);
        const ids = batchChunks.map((_, index) => `${fileId}-chunk-${i + index}`);

        const embeddings = await Promise.all(
          batchChunks.map(chunk => getEmbedding(chunk))
        );

        await collection.add({
          ids,
          embeddings,
          metadatas: batchChunks.map(chunk => ({
            file: fileId,
            chunkSize: chunk.split(" ").length
          })),
          documents: batchChunks
        });

        console.log(`✅ Saved chunks ${i + 1} to ${i + batchChunks.length}`);
        await delay(1000);
      }

      console.log(`🎯 Đã hoàn tất xử lý file: ${file}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  } catch (err) {
    console.error("❌ Critical error:", err);
  }
}

// 📌 Fallback keyword search
function keywordSearch(query, documents, limit = 3) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const scores = documents.map((doc) => {
    let score = 0;
    for (const word of queryWords) {
      if (doc.toLowerCase().includes(word)) score++;
    }
    return { doc, score };
  });

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.doc);
}

// 📌 Search với fallback
async function searchSimilarChunks(query, limit = 3) {
  try {
    const queryEmbedding = await getEmbedding(query);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });

    let docs = results.documents?.flat() || [];
    if (docs.length === 0) {
      console.log("⚠️ No embedding match, fallback to keyword search...");
      const allDocs = await collection.get({});
      docs = keywordSearch(query, allDocs.documents.flat(), limit);
    }
    return docs;
  } catch (err) {
    console.error("❌ Embedding search error, using fallback:", err);
    const allDocs = await collection.get({});
    return keywordSearch(query, allDocs.documents.flat(), limit);
  }
}

// Run script
async function main() {
  await extractAndSaveMdFiles();
}

if (require.main === module) {
  main();
}

module.exports = { extractAndSaveMdFiles, searchSimilarChunks };
