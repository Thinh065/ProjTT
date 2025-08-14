const fs = require("fs");
const mammoth = require("mammoth");
const path = require("path");
const dotenv = require("dotenv");
const { CloudClient } = require("chromadb");
const fetch = require("node-fetch");
const { HfInference } = require("@huggingface/inference");

// Đường dẫn thư mục chứa file .docx
const DOCS_DIR = "C:/Code/ProjCT/knowledgeBase/docx";

// Thêm đường dẫn thư mục chunks
const CHUNKS_DIR = "C:/Code/ProjCT/knowledgeBase/chunks";

// Tải biến môi trường từ .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Sửa cách khởi tạo client
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
    metadata: { "description": "ESH knowledge base chunks" }
  });
}

// Thêm hàm delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Hàm retry với backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries === maxRetries) throw error;
      
      // Tăng thời gian chờ theo cấp số nhân
      const waitTime = Math.min(1000 * Math.pow(2, retries), 10000);
      console.log(`Retry ${retries}/${maxRetries} after ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
}

// Helper function to temporarily suppress logs
const suppressLogsTemporarily = async (fn) => {
  const oldLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = oldLog;
  }
};

// Hàm gọi Hugging Face API để lấy embedding
async function getEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Input text is required and must be a string');
  }

  const cleanText = text.trim().replace(/\s+/g, ' ').slice(0, 2000);

  try {
    const output = await retryWithBackoff(async () => {
      // Không tắt log toàn cục nữa – chỉ log lỗi nếu có
      const result = await inference.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: cleanText,
        options: {
          wait_for_model: true,
          use_cache: true
        }
      });

      if (!result || !Array.isArray(result)) {
        throw new Error('Invalid embedding format received');
      }

      return result;
    });

    return output;
  } catch (err) {
    console.error('❌ Embedding error details:', {
      message: err.message,
      textLength: text?.length,
      textPreview: text?.slice(0, 100)
    });
    throw err;
  }
}

// Hàm chuẩn hóa tên file (loại bỏ .docx)
function normalizeFileName(file) {
  return file.replace(/\.docx$/i, "");
}

// Hàm chia nhỏ văn bản theo câu và số lượng từ
function chunkTextBySentence(text, minWords = 100, maxWords = 150) {
  // Tách thành câu dựa trên dấu chấm, hỏi, cảm thán
  const sentences = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\t/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/);

  const chunks = [];
  let currentChunk = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = sentence.split(' ');
    currentChunk.push(sentence);
    wordCount += words.length;

    if (wordCount >= minWords) {
      chunks.push(currentChunk.join(' ').trim());
      currentChunk = [];
      wordCount = 0;
    }
  }
  // Thêm phần còn lại nếu có
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ').trim());
  }
  return chunks;
}

// Hàm kiểm tra file đã chunk chưa bằng ID
async function isFileChunked(file) {
  await initChroma();
  const fileId = normalizeFileName(file);
  const expectedChunkId = `${fileId}-chunk-0`;

  try {
    const result = await collection.get({ ids: [expectedChunkId] });
    return result.ids.includes(expectedChunkId);
  } catch (err) {
    return false;
  }
}

// Hàm đọc chunks từ file JSON
async function loadChunksFromJson(jsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return {
      filename: data.filename,
      chunks: data.chunks
    };
  } catch (err) {
    console.error(`Error reading chunks from ${jsonPath}:`, err);
    return null;
  }
}

// Hàm lưu chunk vào ChromaDB
async function extractAndSaveDocs() {
  try {
    await initChroma();

    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith(".docx") && !file.startsWith("~$"));

    let processedCount = 0;

    for (const file of files) {
      const fileId = normalizeFileName(file);
      if (await isFileChunked(file)) {
        console.log(`⏩ [ĐÃ XỬ LÝ] File ${file} đã được chunk, bỏ qua.`);
        continue;
      }
      try {
        console.log(`\n📝 Processing file: ${file}`);
        const filePath = path.join(DOCS_DIR, file);

        const result = await mammoth.extractRawText({ path: filePath });
        if (!result.value) {
          throw new Error('Could not read file content');
        }

        const chunks = chunkTextBySentence(result.value, 100, 150);
        console.log(`🔄 Created ${chunks.length} chunks from file ${file}`);

        for (let i = 0; i < chunks.length; i += 10) {
          const batchChunks = chunks.slice(i, i + 10);
          const ids = batchChunks.map((_, index) => `${fileId}-chunk-${i + index}`);

          // Thêm log để debug chunk nào bị treo
          console.log(`🔎 Đang lấy embedding cho các chunk:`, ids);

          const embeddings = await Promise.all(
            batchChunks.map(async (chunk, idx) => {
              try {
                return await getEmbedding(chunk);
              } catch (err) {
                console.error(`❌ Lỗi embedding chunk ${ids[idx]}:`, err);
                throw err;
              }
            })
          );

          await collection.add({
            ids: ids,
            embeddings: embeddings,
            metadatas: batchChunks.map(chunk => ({
              file: fileId,
              chunkSize: chunk.split(' ').length
            })),
            documents: batchChunks
          });

          console.log(`✅ Saved chunks ${i + 1} to ${i + batchChunks.length}`);
          await delay(1000);
        }
        processedCount++;
        console.log(`\n🎯 Đã hoàn tất xử lý file: ${file}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      } catch (fileError) {
        console.error(`❌ Error processing file ${file}:`, fileError);
        continue;
      }
    }

    console.log(`🎉 Đã hoàn tất chunkin ${processedCount} file!`);
  } catch (err) {
    console.error('❌ Critical error:', err);
  }

  try {
    // Thêm xử lý chunks từ Python
    const jsonFiles = fs.readdirSync(CHUNKS_DIR)
      .filter(file => file.endsWith("_chunks.json"));

    for (const jsonFile of jsonFiles) {
      const fileId = jsonFile.replace(/_chunks\.json$/i, "");
      
      if (await isFileChunked(fileId)) {
        console.log(`⏩ [ĐÃ XỬ LÝ] File ${fileId} đã được chunk, bỏ qua.`);
        continue;
      }

      try {
        console.log(`\n📝 Processing chunks from: ${jsonFile}`);
        const chunksData = await loadChunksFromJson(path.join(CHUNKS_DIR, jsonFile));
        
        if (!chunksData) continue;

        const { chunks } = chunksData;
        console.log(`🔄 Loaded ${chunks.length} chunks from ${jsonFile}`);

        // Xử lý từng batch chunks
        for (let i = 0; i < chunks.length; i += 10) {
          const batchChunks = chunks.slice(i, i + 10);
          const ids = batchChunks.map((_, index) => `${fileId}-chunk-${i + index}`);

          console.log(`\n🔎 Batch ${Math.floor(i/10) + 1}/${Math.ceil(chunks.length/10)}:`);
          console.log(`⌛ Đang lấy embedding cho các chunk:`, ids);

          const embeddings = await Promise.all(
            batchChunks.map(async (chunk, idx) => {
              try {
                return await getEmbedding(chunk);
              } catch (err) {
                console.error(`❌ Lỗi embedding chunk ${ids[idx]}:`, err);
                throw err;
              }
            })
          );

          await collection.add({
            ids: ids,
            embeddings: embeddings,
            metadatas: batchChunks.map(chunk => ({
              file: fileId,
              chunkSize: chunk.split(' ').length
            })),
            documents: batchChunks
          });

          console.log(`✅ Đã lưu batch ${Math.floor(i/10) + 1}: chunks ${i + 1} đến ${i + batchChunks.length}`);
          await delay(1000);
        }

        console.log(`\n🎯 Đã hoàn tất xử lý file: ${fileId}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      } catch (error) {
        console.error(`❌ Error processing ${jsonFile}:`, error);
        continue;
      }
    }

  } catch (err) {
    console.error('❌ Critical error:', err);
  }
}

// Hàm tìm kiếm chunk từ ChromaDB
async function searchSimilarChunks(query, limit = 3) {
  try {
    const queryEmbedding = await getEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });

    // Log kết quả truy vấn
    console.log("🔍 Query:", query);
    console.log("📥 Returned:", results.documents[0]?.length || 0, "chunks");
    console.log("📏 Distances:", results.distances?.[0]);

    // Nếu không có chunk phù hợp, trả về fallback
    if (!results.documents[0] || results.documents[0].length === 0) {
      return [
        "Tôi xin lỗi, tôi không có thông tin về vấn đề này trong tài liệu tuyển sinh."
      ];
    }

    return results.documents[0]; // Trả về các chunk phù hợp

  } catch (err) {
    console.error('Search error:', err);
    return [
      "Tôi xin lỗi, tôi không có thông tin về vấn đề này trong tài liệu tuyển sinh."
    ];
  }
}

// Log ra để kiểm tra biến môi trường đã load chưa
console.log("HF_TOKEN:", process.env.HF_TOKEN?.slice(0, 10) + "...");

// Chạy script
async function main() {
  await extractAndSaveDocs();
}

if (require.main === module) {
  main();
}

// Export các hàm cần thiết
module.exports = {
  extractAndSaveDocs,
  searchSimilarChunks
};