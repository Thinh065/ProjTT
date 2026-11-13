const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ChatHistory = require("../models/ChatHistory");
const { auth, requireAdmin } = require("../middleware/auth");
const { uploadUserAvatar } = require("../middleware/cloudinary");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Chỉ chính chủ hoặc admin
const requireSelfOrAdmin = (req, res, next) => {
  if (req.user.id !== req.params.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền" });
  }
  next();
};

// Kiểm tra id trước khi upload, để không đẩy file lên Cloudinary với id rác
const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID không hợp lệ" });
  next();
};

const notSelf = (action) => (req, res, next) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ message: `Không thể ${action} của chính bạn` });
  }
  next();
};

// Đổi quyền user (admin/user)
router.patch(
  "/:id/role",
  auth,
  requireAdmin,
  notSelf("thay đổi quyền"),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
  })
);

// Đổi trạng thái user (block/unblock)
router.patch(
  "/:id/status",
  auth,
  requireAdmin,
  notSelf("thay đổi trạng thái"),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
  })
);

// Xóa user (kèm lịch sử chat của họ)
router.delete(
  "/:id",
  auth,
  requireAdmin,
  notSelf("xóa tài khoản"),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    await ChatHistory.deleteMany({ user: req.params.id });
    res.json({ message: "Đã xóa user" });
  })
);

// Upload avatar (Cloudinary)
router.post(
  "/:id/avatar",
  auth,
  validId,
  requireSelfOrAdmin,
  uploadUserAvatar.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file?.path) return res.status(400).json({ message: "Không có file" });
    const avatarUrl = req.file.path;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarUrl },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json({ avatar: avatarUrl, user });
  })
);

// Đổi mật khẩu. Chính chủ phải nhập mật khẩu hiện tại; admin đổi cho người khác thì không cần.
router.post(
  "/:id/change-password",
  auth,
  requireSelfOrAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const isSelf = req.user.id === req.params.id;

    if (!newPassword || (isSelf && !currentPassword)) {
      return res.status(400).json({ message: "Thiếu thông tin mật khẩu" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    if (isSelf) {
      const match = await bcrypt.compare(String(currentPassword), user.password);
      if (!match) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ message: "Đổi mật khẩu thành công" });
  })
);

// Cập nhật thông tin user (chỉ cho phép đổi tên)
router.patch(
  "/:id",
  auth,
  requireSelfOrAdmin,
  asyncHandler(async (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ message: "Thiếu thông tin tên" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { name }, { new: true }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
  })
);

module.exports = router;
