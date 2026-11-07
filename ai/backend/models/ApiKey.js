const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên AI
  description: { type: String, default: "" },
  apiKey: { type: String, required: true, select: false }, // Không bao giờ trả về mặc định
  baseURL: { type: String, required: true },
  model: { type: String },
  image: { type: String },
  referer: { type: String, default: "" }, // HTTP-Referer (OpenRouter)
  title: { type: String, default: "" }, // X-Title (OpenRouter)
  createdAt: { type: Date, default: Date.now },
  hidden: { type: Boolean, default: false },
});

module.exports = mongoose.model("ApiKey", apiKeySchema);
