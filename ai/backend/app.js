const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Tạo ứng dụng Express (không kết nối DB, không listen) để server.js và test dùng chung
const app = express();
app.disable("x-powered-by");
// Chạy sau reverse proxy (Nginx, Render, Docker...) thì đặt TRUST_PROXY=1 để rate limit lấy đúng IP
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

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

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database: mongoose.connection.readyState === mongoose.STATES.connected ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

const databaseUnavailable = (res) =>
  res.status(503).json({ message: "Backend chưa kết nối được MongoDB. Vui lòng thử lại sau." });

app.use(
  ["/api/auth", "/api/users", "/api/apikeys", "/api/chatbot", "/api/chat/history"],
  (req, res, next) => {
    if (mongoose.connection.readyState !== mongoose.STATES.connected) return databaseUnavailable(res);
    next();
  }
);

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
  if (
    err.name === "MongoServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    err.name === "MongoNetworkTimeoutError" ||
    (err.name === "MongooseError" && mongoose.connection.readyState !== mongoose.STATES.connected)
  ) {
    return databaseUnavailable(res);
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Dữ liệu JSON không hợp lệ" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Dữ liệu gửi lên quá lớn" });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "ID không hợp lệ" });
  }
  if (err.name === "MulterError" || err.http_code === 400) {
    return res.status(400).json({ message: err.message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error("Global error:", err);
  res.status(status).json({
    message: status < 500 || process.env.NODE_ENV === "development" ? err.message : "Lỗi server",
  });
});

module.exports = app;
