const express = require("express");
const { uploadImage, uploadChatImage } = require("../middleware/cloudinary");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Upload ảnh avatar lúc đăng ký (chưa có tài khoản nên không bắt đăng nhập)
// hoặc ảnh đại diện cho bot. Giới hạn: chỉ ảnh, tối đa 5MB.
router.post("/avatar", uploadImage.single("image"), (req, res) => {
  if (!req.file?.path) return res.status(400).json({ message: "Không có file" });
  res.json({ url: req.file.path });
});

router.post("/chat-image", auth, uploadChatImage.single("image"), (req, res) => {
  if (!req.file?.path) return res.status(400).json({ message: "Không có file" });
  res.json({ url: req.file.path });
});

module.exports = router;
