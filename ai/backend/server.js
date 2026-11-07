require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

if (!process.env.JWT_SECRET) {
  console.error("Thiếu biến môi trường JWT_SECRET");
  process.exit(1);
}

const app = express();

// CORS: chỉ cho phép các origin trong CORS_ORIGIN (phân tách bằng dấu phẩy)
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có Origin (curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/apikeys", require("./routes/apikey"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/chatbot", require("./routes/chatbot"));
app.use("/api/chat/history", require("./routes/history"));

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({ message: "ID không hợp lệ" });
  }
  if (err.name === "MulterError" || err.http_code === 400) {
    return res.status(400).json({ message: err.message });
  }
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "development" ? err.message : "Lỗi server",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.CHROMA_API_KEY) {
    const { extractAndSaveMdFiles } = require("./models/KnowledgeChunk");
    extractAndSaveMdFiles()
      .then(() => console.log("Knowledge extraction completed"))
      .catch((err) => console.error("Knowledge extraction error:", err.message));
  }
});
