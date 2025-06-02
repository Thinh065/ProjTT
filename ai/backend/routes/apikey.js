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

module.exports = router