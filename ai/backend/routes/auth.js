const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Đăng ký
router.post("/register", async (req, res) => {
  try {
    console.log("Register request body:", req.body); // Fixed typo here
    const { name, email, password, avatar } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Tài khoản đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      avatar: avatar || null,
      role: "user",
      status: "active",
    });

    res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Lỗi server khi đăng ký",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Vui lòng điền email và mật khẩu",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    // Check if user is blocked
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        message: "Tài khoản hoặc mật khẩu không đúng",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Lỗi server khi đăng nhập",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Lấy danh sách user (chỉ admin)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Verify token endpoint
router.get("/verify", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Không có token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(401).json({ message: "Token không hợp lệ" });
  }
});

module.exports = router;
