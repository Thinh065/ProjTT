const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const multer = require("multer")
const path = require("path")

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới được phép" })
  }
  next()
}

// Nâng quyền user (admin/user)
router.patch("/users/:id/role", auth, requireAdmin, async (req, res) => {
  const { role } = req.body
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Vai trò không hợp lệ" })
  }
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: "Không thể thay đổi quyền của chính bạn" })
  }
  const user = await require("../models/User").findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-password")
  res.json(user) // user phải có avatar
})

// Đổi trạng thái user (block/unblock)
router.patch("/users/:id/status", auth, requireAdmin, async (req, res) => {
  const { status } = req.body
  if (!["active", "blocked"].includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" })
  }
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: "Không thể thay đổi trạng thái của chính bạn" })
  }
  const user = await require("../models/User").findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select("-password")
  res.json(user) // user phải có avatar
})

// Xóa user
router.delete("/users/:id", auth, requireAdmin, async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: "Không thể xóa chính bạn" })
  }
  await require("../models/User").findByIdAndDelete(req.params.id)
  res.json({ message: "Đã xóa user" })
})

// Cấu hình lưu file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars/")
  },
  filename: (req, file, cb) => {
    cb(null, req.user._id + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

// API upload avatar cho user
router.post("/users/:id/avatar", auth, upload.single("avatar"), async (req, res) => {
  if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền" })
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`
  const user = await require("../models/User").findByIdAndUpdate(
    req.params.id,
    { avatar: avatarUrl },
    { new: true }
  ).select("-password")
  res.json(user)
})

module.exports = router