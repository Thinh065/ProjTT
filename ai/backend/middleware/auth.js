const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Kiểm tra token, nạp user từ DB (để chặn ngay user bị khóa hoặc đã bị xóa)
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password").lean();
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }
    // Mật khẩu đã đổi sau khi token được cấp → token cũ không còn hiệu lực
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
    }

    req.user = {
      ...user,
      id: user._id.toString(),
      _id: user._id.toString(),
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới được phép" });
  }
  next();
};

// Cấp JWT; tv = tokenVersion để đổi mật khẩu là vô hiệu hóa các phiên cũ
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });

module.exports = auth;
module.exports.signToken = signToken;
module.exports.auth = auth;
module.exports.requireAdmin = requireAdmin;
