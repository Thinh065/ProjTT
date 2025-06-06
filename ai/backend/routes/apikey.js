const express = require("express")
const router = express.Router()
const ApiKey = require("../models/ApiKey")

// Thêm ChatBot mới
router.post("/", async (req, res) => {
  try {
    const { name, apiKey, baseURL, model, image } = req.body
    const newBot = new ApiKey({ name, apiKey, baseURL, model, image })
    await newBot.save()
    res.status(201).json(newBot)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Lấy danh sách ChatBot
router.get("/", async (req, res) => {
  const bots = await ApiKey.find()
  res.json(bots)
})

// Tạm ẩn hoặc hiện ChatBot
router.patch("/:id/hide", async (req, res) => {
  const { hidden } = req.body
  const bot = await ApiKey.findByIdAndUpdate(req.params.id, { hidden }, { new: true })
  if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" })
  res.json(bot)
})

// Xóa ChatBot
router.delete("/:id", async (req, res) => {
  const bot = await ApiKey.findByIdAndDelete(req.params.id)
  if (!bot) return res.status(404).json({ message: "Không tìm thấy ChatBot" })
  res.json({ message: "Đã xóa ChatBot" })
})

module.exports = router