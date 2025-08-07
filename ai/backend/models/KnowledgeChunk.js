const fs = require("fs");
const mammoth = require("mammoth");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const { HfInference } = require("@huggingface/inference"); // Sửa cách import

// Đường dẫn thư mục chứa file .docx
const DOCS_DIR = "C:/Code/ProjCT/knowledgeBase/docx";

// Tải biến môi trường từ .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Sửa cách khởi tạo client
const inference = new HfInference(process.env.HF_TOKEN);

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

// Hàm gọi Hugging Face API để lấy embedding
async function getEmbedding(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Input text is required and must be a string');
    }

    // Cleanup text
    const cleanText = text
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 2000);

    // Retry logic for API call
    const output = await retryWithBackoff(async () => {
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
    console.error('Embedding error details:', {
      message: err.message,
      textLength: text?.length,
      textPreview: text?.slice(0, 100)
    });
    throw err;
  }
}

// Hàm chia nhỏ văn bản thành các đoạn
function chunkText(text, maxLength) {
  // Clean text trước khi xử lý
  const cleanText = text
    .replace(/\r\n/g, ' ')           // Replace Windows line breaks  
    .replace(/\n/g, ' ')             // Replace Unix line breaks
    .replace(/\s+/g, ' ')            // Replace multiple spaces
    .replace(/\t/g, ' ')             // Replace tabs
    .trim();

  const chunks = [];
  let start = 0;

  while (start < cleanText.length) {
    let end = start + maxLength;

    // Đảm bảo không cắt ngang từ
    if (end < cleanText.length && cleanText[end] !== " ") {
      while (end > start && cleanText[end] !== " ") {
        end--;
      }
    }

    // Nếu không tìm thấy khoảng trắng, cắt tại vị trí tối đa
    if (end === start) {
      end = start + maxLength;
    }

    chunks.push(cleanText.slice(start, end).trim());
    start = end;
  }

  return chunks;
}

// Thêm hàm kiểm tra file đã được xử lý
async function isFileProcessed(filename) {
  const fileChunks = await KnowledgeChunk.findOne({ file: filename });
  return !!fileChunks;
}

// Define schema first
const chunkSchema = new mongoose.Schema({
  file: { type: String, required: true },
  chunk: { type: String, required: true },
  embedding: { type: [Number], required: true }
});

// Create text index with weights and language support
// chunkSchema.index(
//   { chunk: 'text' },
//   {
//     weights: { chunk: 10 },
//     name: "ChunkTextIndex",
//     default_language: "none",
//     language_override: "none"
//   }
// );

async function ensureIndexes() {
  try {
    const collection = mongoose.connection.collection('knowledgechunks');
    
    // Get all indexes as an array
    const indexes = await collection.indexInformation();
    
    // Drop existing indexes except _id
    for (const indexName of Object.keys(indexes)) {
      if (indexName !== '_id_') {
        await collection.dropIndex(indexName);
        console.log(`Đã xóa index: ${indexName}`);
      }
    }

    // Create new text index
    await collection.createIndex(
      { chunk: 'text' },
      {
        name: 'chunk_text_idx',
        weights: { chunk: 10 },
        default_language: 'none',
        language_override: 'none'
      }
    );
    console.log('Tạo text index mới thành công');

  } catch (err) {
    console.error('Lỗi quản lý indexes:', err);
  }
}

// Update the initialization
async function initialize() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, {
        dbName: "test",
        connectTimeoutMS: 30000
      });
      console.log('MongoDB kết nối thành công');
    }
    
    await ensureIndexes();
  } catch (err) {
    console.error('Lỗi khởi tạo:', err);
    throw err;
  }
}

// Create model
const KnowledgeChunk = mongoose.model('KnowledgeChunk', chunkSchema);

// Create indexes
ensureIndexes();

// MongoDB connection handling
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB đã kết nối');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "test",
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });

    // Đợi 1 giây trước khi tạo index
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Tạo index sau khi kết nối thành công
    await ensureIndexes();
    
    console.log('MongoDB kết nối thành công');
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err);
    throw err;
  }
};

// Thêm hàm xóa dữ liệu cũ
async function clearExistingData() {
  try {
    await KnowledgeChunk.deleteMany({});
    console.log('🗑️ Đã xóa tất cả dữ liệu cũ');
  } catch (err) {
    console.error('Lỗi khi xóa dữ liệu:', err);
  }
}

// Cập nhật hàm extractAndSaveDocs
async function extractAndSaveDocs() {
  try {
    await connectDB();
    
    // Xóa dữ liệu cũ trước khi import
    await clearExistingData();

    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith(".docx") && !file.startsWith("~$"));

    console.log(`📊 Tìm thấy ${files.length} files để xử lý`);

    for (const file of files) {
      try {
        console.log(`\n📝 Đang xử lý file: ${file}`);
        const filePath = path.join(DOCS_DIR, file);
        
        const result = await mammoth.extractRawText({ path: filePath });
        if (!result.value) {
          throw new Error('Không thể đọc nội dung file');
        }

        // Log nội dung để debug
        console.log(`📄 Nội dung file ${file} (preview):`, result.value.substring(0, 200));
        
        const chunks = chunkText(result.value, 500, 50);
        console.log(`🔄 Tạo được ${chunks.length} chunks từ file ${file}`);

        // Xử lý từng chunk
        for (const [index, chunk] of chunks.entries()) {
          try {
            // Đợi 2 giây giữa các request để tránh rate limit
            await delay(2000);
            
            // Log để theo dõi tiến trình
            console.log(`\n⏳ Đang xử lý chunk ${index + 1}/${chunks.length} của file ${file}`);
            console.log(`Preview chunk: ${chunk.substring(0, 100)}...`);

            const embedding = await getEmbedding(chunk);
            await KnowledgeChunk.create({
              file,
              chunk,
              embedding
            });

            console.log(`✅ Đã lưu chunk ${index + 1}`);
          } catch (chunkError) {
            console.error(`❌ Lỗi xử lý chunk ${index + 1}:`, chunkError);
            // Tiếp tục với chunk tiếp theo
            continue;
          }
        }

      } catch (fileError) {
        console.error(`❌ Lỗi xử lý file ${file}:`, fileError);
        // Tiếp tục với file tiếp theo
        continue;
      }
    }

  } catch (err) {
    console.error('❌ Lỗi nghiêm trọng:', err);
  }
}

// Thêm hàm main để chạy script
async function main() {
  try {
    await extractAndSaveDocs();
    console.log('✨ Hoàn tất import dữ liệu');
  } catch (err) {
    console.error('💥 Lỗi chính:', err);
  } finally {
    // Đợi 5 giây trước khi đóng kết nối
    await delay(5000);
    await mongoose.disconnect();
    console.log('👋 Đã đóng kết nối MongoDB');
  }
}

// Log ra để kiểm tra biến môi trường đã load chưa
console.log("HF_TOKEN:", process.env.HF_TOKEN?.slice(0, 10) + "...");

// Chạy script
if (require.main === module) {
  main();
}

// Add connection error handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  setTimeout(() => connectDB(), 5000);
});

// Export model
module.exports = KnowledgeChunk;