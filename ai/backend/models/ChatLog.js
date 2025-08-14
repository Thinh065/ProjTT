const mongoose = require("mongoose");

const ChatLogSchema = new mongoose.Schema({
  question: { type: String, required: true },
  sourceChunks: { type: [String], default: [] },
  answer: { type: String, default: "" },
  error: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ChatLog", ChatLogSchema);