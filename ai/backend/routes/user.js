const express = require("express")
const User = require("../models/User")
const router = express.Router()

// Middleware kiểm tra quyền admin
const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới được phép" })
  }
  next()
}

// Đổi role user
router.patch("/:id/role", requireAdmin, async (req, res) => {
  const { role } = req.body
  if (!["admin", "user"].includes(role)) return res.status(400).json({ message: "Role không hợp lệ" })
  // Không cho phép tự hạ quyền hoặc xóa chính mình
  if (req.user._id.toString() === req.params.id) return res.status(400).json({ message: "Không thể thay đổi quyền của chính bạn" })
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password")
  res.json(user)
})

// Đổi trạng thái user (block/unblock)
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body
  if (!["active", "blocked"].includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ" })
  if (req.user._id.toString() === req.params.id) return res.status(400).json({ message: "Không thể thay đổi trạng thái của chính bạn" })
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password")
  res.json(user)
})

// Xóa user
router.delete("/:id", requireAdmin, async (req, res) => {
  if (req.user._id.toString() === req.params.id) return res.status(400).json({ message: "Không thể xóa chính bạn" })
  await User.findByIdAndDelete(req.params.id)
  res.json({ message: "Đã xóa user" })
})

module.exports = router