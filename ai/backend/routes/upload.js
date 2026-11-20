const express = require("express");
const { uploadImage } = require("../middleware/cloudinary");
const rateLimit = require("../utils/rateLimit");
const { auth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Upload ảnh đại diện cho ChatBot (chỉ admin). Ảnh của người dùng — kể cả lúc đăng ký — đi qua
// /api/users/:id/avatar sau khi đã có tài khoản, để người lạ không dùng Cloudinary làm kho ảnh.
// Giới hạn: chỉ ảnh, tối đa 5MB, 20 ảnh/giờ/IP.
const uploadLimiter = rateLimit({ name: "upload", windowMs: 60 * 60 * 1000, max: 20 });

router.post("/avatar", auth, requireAdmin, uploadLimiter, uploadImage.single("image"), (req, res) => {
  if (!req.file?.path) return res.status(400).json({ message: "Không có file" });
  res.json({ url: req.file.path });
});

module.exports = router;
