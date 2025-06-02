const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  status: { type: String, default: "active" },
  avatar: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("User", userSchema)