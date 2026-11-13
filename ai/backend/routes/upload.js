const express = require("express");
const { uploadImage } = require("../middleware/cloudinary");
const rateLimit = require("../utils/rateLimit");

const router = express.Router();

// Upload ảnh avatar lúc đăng ký (chưa có tài khoản nên không bắt đăng nhập)
// hoặc ảnh đại diện cho bot. Giới hạn: chỉ ảnh, tối đa 5MB.
// Route này không cần đăng nhập nên giới hạn theo IP để tránh bị lạm dụng làm kho ảnh
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

router.post("/avatar", uploadLimiter, uploadImage.single("image"), (req, res) => {
  if (!req.file?.path) return res.status(400).json({ message: "Không có file" });
  res.json({ url: req.file.path });
});

module.exports = router;
