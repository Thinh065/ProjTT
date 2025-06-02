const mongoose = require("mongoose")

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },        // Tên AI
  apiKey: { type: String, required: true },      // API Key
  baseURL: { type: String, required: true },     // Base URL
  model: { type: String },                       // Model (nếu có)
  image: { type: String },                       // Ảnh đại diện (nếu có)
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("ApiKey", apiKeySchema)