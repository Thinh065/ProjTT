const express = require("express")
const router = express.Router()
const OpenAI = require("openai")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const KnowledgeChunk = require("../models/KnowledgeChunk"); // Add this import
const { searchSimilarChunks } = require("../models/KnowledgeChunk");
const ChatLog = require("../models/ChatLog"); // Tạo model này nếu chưa có

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
    const { model, messages, apiKey, baseURL } = req.body;
    
    // Validate required fields
    if (!model || !messages || !apiKey || !baseURL) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: {
          model: !model ? "Missing model" : null,
          messages: !messages ? "Missing messages" : null,
          apiKey: !apiKey ? "Missing apiKey" : null,
          baseURL: !baseURL ? "Missing baseURL" : null
        }
      });
    }

    // Validate messages format
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Invalid messages format",
        details: "Messages must be a non-empty array"
      });
    }

    // Tiếp tục xử lý như cũ
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

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3n-e2b-it:generateContent";

// Update the Gemini route
router.post("/gemini", async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1];

    // Search similar chunks from ChromaDB
    const relevantChunks = await searchSimilarChunks(lastMessage.content, 10);

    // Nếu không có chunk nào, trả về fallback
    let context = "";
    let sourceChunks = [];
    if (!relevantChunks || relevantChunks.length === 0 || (relevantChunks.length === 1 && relevantChunks[0].startsWith("Tôi xin lỗi"))) {
      context = "";
      sourceChunks = [];
    } else {
      context = relevantChunks.join("\n\n");
      sourceChunks = relevantChunks;
    }

    // Create system prompt
    const systemPrompt = `Bạn là Thanh Thuỷ, một cô giáo hướng dẫn tuyển sinh của trường phổ thông ESH.
    Hãy trả lời câu hỏi của học sinh dựa trên thông tin được cung cấp dưới đây.
    Nếu câu hỏi không liên quan đến thông tin tuyển sinh hoặc không thể trả lời dựa trên thông tin này, hãy trả lời
    "Tôi xin lỗi, tôi không có thông tin về vấn đề này trong tài liệu tuyển sinh."

    CÂU TRẢ LỜI CÓ SẴN:
   1. **Giới thiệu chung về ESH**:
   - Trường tư thục đào tạo từ Mầm non đến Lớp 12, định hướng trở thành trường STEM hàng đầu Việt Nam.
   - Môi trường học tập thân thiện, an toàn, hiện đại với cơ sở vật chất thông minh và đầy đủ (hồ bơi, nhà thi đấu, sân thể thao, khu sinh hoạt...).

  2. **Chương trình học**:
   - Chương trình MOET + tiếng Anh Oxford.
   - Chương trình AES (Advanced English Skills).
   - Chương trình VCE (Victoria – Úc).
   - Hệ sinh thái học STEAM, SEL, giáo dục thể chất và phát triển năng khiếu.
   - Dạy học theo hướng toàn diện, tích hợp, chú trọng tính cách, kỹ năng, học thuật.

  3. **Giáo dục bổ trợ & chăm sóc toàn diện**:
   - Chương trình “Giáo dục tính cách bằng hành động” gồm 10 đức tính nền tảng (trách nhiệm, chính trực, lạc quan...).
   - Chương trình SEL (trí tuệ cảm xúc - xã hội).
   - Well-being – hỗ trợ tâm lý, tinh thần, tư vấn cá nhân, phụ huynh.
   - Các hoạt động ngoại khoá đa dạng: CLB, trại hè, dã ngoại học tập…

  4. **Đội ngũ giáo viên**:
   - Giáo viên Việt Nam và Quốc tế, nhiều người có chứng chỉ chuyên môn và kinh nghiệm lâu năm tại ESH.
   - Triết lý giáo dục đa dạng, nhân văn, khơi dậy đam mê, khuyến khích sự sáng tạo và tôn trọng cá tính học sinh.

  5. **Tuyển sinh & học phí**:
   - Quy trình tuyển sinh 6 bước rõ ràng, từ tư vấn đến kiểm tra đầu vào và nhập học.
   - Hồ sơ nhập học đầy đủ theo quy định.
   - Chính sách học phí minh bạch, hỗ trợ tài chính linh hoạt.
   - Có học bổng Tài năng Einstein – lên tới 100% học phí (dành cho Lớp 2–12).
   - Dịch vụ xe đưa rước và ăn uống dinh dưỡng, an toàn từ đơn vị chuyên nghiệp (May Catering).

    THÔNG TIN tuyển sinh bổ sung (KHÔNG ĐƯỢC DÙNG KIẾN THỨC NGOÀI):
    ${context}

    Câu hỏi: ${lastMessage.content}

    Trả lời:`;

    // Gọi Gemini API với prompt đã tạo
    const response = await fetch(
      GEMINI_API_URL + "?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      }
    );

    let answer = "";
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      answer = "Lỗi khi gọi Gemini API";
      // Log vào DB
      await ChatLog.create({
        question: lastMessage.content,
        sourceChunks,
        answer,
        error: errorText,
        createdAt: new Date()
      });
      return res.status(response.status).json({
        error: "Error calling Gemini API",
        sourceChunks
      });
    }

    const data = await response.json();
    answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ Gemini API";

    // Log vào DB
    await ChatLog.create({
      question: lastMessage.content,
      sourceChunks,
      answer,
      createdAt: new Date()
    });

    res.json({
      message: answer,
      sourceChunks
    });

  } catch (err) {
    console.error("Server error in /gemini:", err);
    // Log vào DB
    await ChatLog.create({
      question: req.body?.messages?.[req.body.messages.length - 1]?.content || "",
      sourceChunks: [],
      answer: "",
      error: err.message,
      createdAt: new Date()
    });
    res.status(500).json({
      error: err.message || "Internal server error",
      sourceChunks: []
    });
  }
});

module.exports = router