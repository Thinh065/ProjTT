require("dotenv").config();
const mongoose = require("mongoose");

const jwtSecret = process.env.JWT_SECRET || "";
if (!jwtSecret) {
  console.error("Thiếu biến môi trường JWT_SECRET");
  process.exit(1);
}
if (jwtSecret === "change_me" || jwtSecret.length < 32) {
  const msg =
    "JWT_SECRET quá ngắn hoặc vẫn là giá trị mẫu. Tạo chuỗi mới: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"";
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`⚠️  ${msg}`);
}
if (!process.env.MONGO_URI) {
  console.error("Thiếu biến môi trường MONGO_URI");
  process.exit(1);
}

const app = require("./app");

mongoose.set("bufferCommands", false);
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  require("./utils/localKnowledge").getKnowledgeIndex()
    .then((index) => console.log(`Local ESH knowledge ready: ${index.documentCount} documents, ${index.chunks.length} chunks`))
    .catch((err) => console.error("Local ESH knowledge unavailable:", err.message));
  if (process.env.CHROMA_SYNC_ON_START === "true" && process.env.CHROMA_API_KEY) {
    const { extractAndSaveMdFiles } = require("./models/KnowledgeChunk");
    extractAndSaveMdFiles()
      .then(() => console.log("Knowledge extraction completed"))
      .catch((err) => console.error("Knowledge extraction error:", err.message));
  }
});
