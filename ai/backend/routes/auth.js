const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const router = express.Router()

// Đăng ký
router.post("/register", async (req, res) => {
  const { name, email, password, avatar } = req.body
  const existing = await User.findOne({ email })
  if (existing) return res.status(400).json({ message: "Tài khoản đã tồn tại" })
  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, password: hash, avatar })
  res.json({ message: "Đăng ký thành công" })
})

// Đăng nhập
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ message: "Tài khoản không tồn tại" })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng" })
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" })
  res.json({
    token,
    user: {
      _id: user._id, // Thay 'id' thành '_id' để đồng bộ với MongoDB và frontend
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt
    }
  })
})

// Lấy danh sách user (chỉ admin)
router.get("/users", async (req, res) => {
  const users = await User.find().select("-password")
  res.json(users)
})

module.exports = router