const express = require("express")
const router = express.Router()
const User = require("../models/User")
const auth = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const uploadCloud = require("../middleware/cloudinary")
const bcrypt = require("bcryptjs")

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

// API upload avatar cho user (dùng Cloudinary)
router.post("/users/:id/avatar", auth, uploadCloud.single("avatar"), async (req, res) => {
  if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền" })
  }
  // req.file.path là link Cloudinary
  const avatarUrl = req.file.path
  const user = await require("../models/User").findByIdAndUpdate(
    req.params.id,
    { avatar: avatarUrl },
    { new: true }
  ).select("-password")
  res.json({ avatar: avatarUrl, user })
})

// Đổi mật khẩu user
router.post("/users/:id/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Thiếu thông tin mật khẩu" })
  }
  const user = await require("../models/User").findById(req.params.id)
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" })

  // Chỉ cho phép đổi mật khẩu của chính mình hoặc admin
  if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền đổi mật khẩu" })
  }

  const match = await bcrypt.compare(currentPassword, user.password)
  if (!match) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" })

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()
  res.json({ message: "Đổi mật khẩu thành công" })
})

// Cập nhật thông tin cơ bản (tên, avatar)
router.patch("/users/:id", auth, async (req, res) => {
  if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền" })
  }
  const { name } = req.body
  if (!name) return res.status(400).json({ message: "Thiếu tên" })
  const user = await require("../models/User").findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true }
  ).select("-password")
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" })
  res.json(user)
})

module.exports = router