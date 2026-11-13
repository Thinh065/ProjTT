const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatHistory = require("../models/ChatHistory");
const { auth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const rateLimit = require("../utils/rateLimit");

const router = express.Router();

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  status: user.status,
  createdAt: user.createdAt,
});

// Chống dò mật khẩu / tạo tài khoản hàng loạt theo IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Bạn đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút.",
});
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Đăng ký
router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { name, password, avatar } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const existing = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
    if (existing) {
      return res.status(400).json({ message: "Tài khoản đã tồn tại" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email,
      password: hash,
      avatar: typeof avatar === "string" ? avatar : "",
      role: "user",
      status: "active",
    });

    res.status(201).json({ message: "Đăng ký thành công", user: publicUser(user) });
  })
);

// Đăng nhập
router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng điền email và mật khẩu" });
    }

    const user = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
    // Cùng một thông báo cho "không tồn tại" và "sai mật khẩu" để không lộ email nào đã đăng ký
    const match = user ? await bcrypt.compare(String(password), user.password) : false;
    if (!user || !match) {
      return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user: publicUser(user) });
  })
);

// Thông tin tài khoản hiện tại (frontend dùng để kiểm tra token và làm mới quyền/avatar)
router.get("/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Danh sách user kèm tổng token và số cuộc trò chuyện (chỉ admin)
router.get(
  "/users",
  auth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    const stats = await ChatHistory.aggregate([
      {
        $group: {
          _id: "$user",
          totalTokens: { $sum: "$totalTokens" },
          chatCount: { $sum: 1 },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));
    res.json(
      users.map((u) => ({
        ...u,
        totalTokens: byUser.get(String(u._id))?.totalTokens || 0,
        chatCount: byUser.get(String(u._id))?.chatCount || 0,
      }))
    );
  })
);

module.exports = router;
