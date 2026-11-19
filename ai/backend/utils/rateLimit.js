// Giới hạn số request theo cửa sổ thời gian.
// Bộ đếm lưu trong MongoDB (collection "ratelimits", tự hết hạn bằng TTL index) nên đúng cả khi
// chạy nhiều instance hoặc server khởi động lại; DB chưa kết nối thì tạm đếm trong bộ nhớ.
const mongoose = require("mongoose");

let indexReady;
function collection() {
  if (mongoose.connection.readyState !== mongoose.STATES.connected) return null;
  const col = mongoose.connection.db.collection("ratelimits");
  if (!indexReady) {
    indexReady = col.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
      indexReady = null;
      console.error("Không tạo được TTL index cho ratelimits:", err.message);
    });
  }
  return col;
}

async function hitMongo(col, id, windowMs) {
  const now = new Date();
  const expired = { $lt: [{ $ifNull: ["$resetAt", new Date(0)] }, now] };
  const doc = await col.findOneAndUpdate(
    { _id: id },
    [{
      $set: {
        count: { $cond: [expired, 1, { $add: ["$count", 1] }] },
        resetAt: { $cond: [expired, new Date(now.getTime() + windowMs), "$resetAt"] },
      },
    }],
    { upsert: true, returnDocument: "after" }
  );
  const entry = doc?.value ?? doc; // driver cũ trả { value }, driver mới trả document
  return { count: entry.count, reset: entry.resetAt.getTime() };
}

module.exports = function rateLimit({ name = "default", windowMs, max, key = (req) => req.ip, message }) {
  const memory = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of memory) if (entry.reset <= now) memory.delete(k);
  }, windowMs);
  sweep.unref();

  const hitMemory = (k) => {
    const now = Date.now();
    let entry = memory.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      memory.set(k, entry);
    }
    entry.count += 1;
    return entry;
  };

  return async (req, res, next) => {
    const k = `${name}:${key(req)}`;
    let entry;
    const col = collection();
    if (col) {
      try {
        entry = await hitMongo(col, k, windowMs);
      } catch (err) {
        console.error("Rate limit dùng bộ nhớ tạm do lỗi DB:", err.message);
      }
    }
    entry ||= hitMemory(k);
    if (entry.count > max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((entry.reset - Date.now()) / 1000))));
      return res.status(429).json({ message: message || "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau." });
    }
    next();
  };
};
