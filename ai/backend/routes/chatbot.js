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
  const { model, messages, apiKey, baseURL } = req.body;
  if (!model || !messages || !apiKey || !baseURL) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Đảm bảo baseURL là https://openrouter.ai/api/v1/chat/completions
    const endpoint = baseURL.endsWith("/chat/completions")
      ? baseURL
      : baseURL.replace(/\/$/, "") + "/chat/completions";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(req.body.referer && { "HTTP-Referer": req.body.referer }),
        ...(req.body.title && { "X-Title": req.body.title }),
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    })

    let data
    if (response.ok) {
      data = await response.json()
    } else {
      const errorText = await response.text()
      console.error("OpenRouter error:", errorText)
      return res.status(response.status).json({ error: { message: errorText } })
    }

    res.json(data)
  } catch (err) {
    console.error("Chatbot dynamic error:", err)
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

module.exports = router