const express = require("express")
const ApiKey = require("../models/ApiKey")
const router = express.Router()

router.get("/", async (req, res) => {
  const keys = await ApiKey.find()
  res.json(keys)
})

router.post("/", async (req, res) => {
  const { name, apiKey, baseURL, model, image, referer, title } = req.body
  const key = await ApiKey.create({ name, apiKey, baseURL, model, image, referer, title })
  res.json(key)
})

router.patch("/:id", async (req, res) => {
  const { status } = req.body
  const key = await ApiKey.findByIdAndUpdate(req.params.id, { status }, { new: true })
  res.json(key)
})

router.delete("/:id", async (req, res) => {
  await ApiKey.findByIdAndDelete(req.params.id)
  res.json({ message: "Đã xóa ChatBot" })
})

module.exports = router