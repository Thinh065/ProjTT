const jwt = require("jsonwebtoken")
const User = require("../models/User")

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "Không có token" })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Lấy user từ database để lấy đúng role hiện tại
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ message: "Không tìm thấy user" })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: "Token không hợp lệ" })
  }
}