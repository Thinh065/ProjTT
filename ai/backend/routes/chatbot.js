const express = require("express")
const router = express.Router()
const OpenAI = require("openai")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

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
    if (baseURL.includes("models.github.ai")) {
      // Gọi GitHub Model (Azure AI)
      const endpoint = baseURL;
      const client = ModelClient(endpoint, new AzureKeyCredential(apiKey));
      const response = await client.path("/chat/completions").post({
        body: {
          messages,
          temperature: 1.0,
          top_p: 1.0,
          model
        }
      });
      if (isUnexpected(response)) {
        console.error("Azure AI error:", response.body.error);
        return res.status(500).json({ error: response.body.error });
      }
      console.log("Azure AI response:", response.body);
      return res.json(response.body);
    } else {
      // Gọi OpenRouter như cũ
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
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("OpenRouter error:", data);
        return res.status(response.status).json({ error: data.error || data });
      }
      console.log("OpenRouter response:", data);
      return res.json(data);
    }
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
})

module.exports = router