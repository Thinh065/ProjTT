// Chạy backend với MongoDB tạm trong bộ nhớ — không cần cài MongoDB, không đụng DB thật.
// Dữ liệu mất khi tắt. Dùng: npm run dev:memory
// Tự tạo một tài khoản admin; email/mật khẩu in ra console (đặt DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD để cố định).
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.MONGO_DB_NAME = "projtt-dev-memory";
  process.env.NODE_ENV = process.env.NODE_ENV === "production" ? "development" : process.env.NODE_ENV || "development";
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  }

  const mongoose = require("mongoose");
  const bcrypt = require("bcryptjs");
  const User = require("../models/User");

  mongoose.connection.once("connected", async () => {
    const email = (process.env.DEV_ADMIN_EMAIL || "admin@dev.local").toLowerCase();
    const password = process.env.DEV_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
    await User.create({ name: "Admin (dev)", email, password: await bcrypt.hash(password, 10), role: "admin" });
    console.log(`[dev:memory] Admin thử: ${email} / ${password}`);
  });

  const stop = async () => {
    await mongoose.disconnect().catch(() => {});
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  require("../server");
})().catch((err) => {
  console.error("[dev:memory] Không khởi động được:", err.message);
  process.exit(1);
});
