const mongoose = require("mongoose")

const apiKeySchema = new mongoose.Schema({
  name: String,
  apiKey: String,
  baseURL: String,
  model: String,
  image: String,
  referer: String,
  title: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("ApiKey", apiKeySchema)