const express = require("express")
const router = express.Router()
const OpenAI = require("openai")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://your-site.com",
    "X-Title": "Your Site Name",
  },
})

// Route cũ dùng OpenAI SDK
router.post("/openrouter", async (req, res) => {
  try {
    const { prompt, model } = req.body
    const completion = await openai.chat.completions.create({
      model: model || "deepseek/deepseek-r1-0528:free",
      messages: [{ role: "user", content: prompt }],
    })
    res.json({ message: completion.choices[0].message })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Route động nhận mọi tham số và gọi API bất kỳ
router.post("/dynamic", async (req, res) => {
  try {
    const { model, messages, apiKey, baseURL, referer, title } = req.body

    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(referer && { "HTTP-Referer": referer }),
        ...(title && { "X-Title": title }),
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error("Chatbot dynamic error:", err)
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

module.exports = router