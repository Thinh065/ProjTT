// Giới hạn số request theo cửa sổ thời gian, lưu trong bộ nhớ của process.
// Đủ cho một instance backend; chạy nhiều instance thì cần store dùng chung (Redis).
module.exports = function rateLimit({ windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) if (entry.reset <= now) hits.delete(k);
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message: message || "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau." });
    }
    next();
  };
};
