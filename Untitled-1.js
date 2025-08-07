const express = require("express")
const router = express.Router()
const OpenAI = require("openai")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const mongoose = require("mongoose");
const KnowledgeChunk = require("../models/KnowledgeChunk"); // Add this import
const PROMPTS = require('../utils/prompts');

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Multi ChatBot AI",
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
    
    // Detailed validation
    const errors = {
      model: !model ? "Model is required" : null,
      messages: !messages ? "Messages are required" : 
               !Array.isArray(messages) ? "Messages must be an array" : null,
      apiKey: !apiKey ? "API Key is required" : null,
      baseURL: !baseURL ? "Base URL is required" : null
    };

    const missingFields = Object.entries(errors)
      .filter(([_, error]) => error !== null)
      .map(([field, error]) => `${field}: ${error}`);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: missingFields
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
        // Thêm xử lý lỗi chi tiết bằng tiếng Việt
        let errorMessage = "Đã xảy ra lỗi không xác định";
        
        if (data.error?.message?.includes('API key expired')) {
          errorMessage = "API key đã hết hạn. Vui lòng cập nhật API key mới.";
        } else if (data.error?.message) {
          errorMessage = `Lỗi từ OpenRouter: ${data.error.message}`;
        }

        console.error("OpenRouter error:", data);
        return res.status(response.status).json({ 
          error: errorMessage,
          details: data.error 
        });
      }

      return res.json(data);

    }
  } catch (err) {
    console.error("Lỗi server:", err);
    res.status(500).json({ 
      error: "Đã xảy ra lỗi khi xử lý yêu cầu: " + err.message 
    });
  }
})

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

router.post("/gemini", async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1];
    const questionLower = lastMessage.content.toLowerCase();
    
    // Khởi tạo conversation state
    let conversationState = {
      step: 'initial',
      selectedBlock: null,
      selectedPosition: null
    };

    // Xác định step và prompt phù hợp
    let selectedPrompt = '';
    
    // Step 1: Kiểm tra nếu là câu hỏi về giáo viên
    if (
      questionLower.includes('giáo viên') || 
      questionLower.includes('giảng viên') ||
      questionLower.includes('đội ngũ')
    ) {
      // Step 2: Kiểm tra xem đã chọn khối chưa
      if (questionLower.includes('mầm non')) {
        conversationState = {
          step: 'block_selected',
          selectedBlock: 'Mầm non',
          positions: [
            'Giáo viên Chủ nhiệm',
            'Nhân viên nuôi dưỡng'
          ]
        };
      } else if (questionLower.includes('tiểu học')) {
        conversationState = {
          step: 'block_selected',
          selectedBlock: 'Tiểu học',
          positions: [
            'Trưởng bộ môn',
            'Giáo viên Chủ nhiệm',
            'Giáo viên Toán Tiếng Anh',
            'Giáo viên Khoa học Tiếng Anh',
            'Giáo viên Mỹ thuật',
            'Giáo viên Âm nhạc',
            'Giáo viên Tin học',
            'Giáo viên Thể chất & Bơi lội',
            'Giáo viên Tiếng Anh & Trợ giảng'
          ]
        };
      } else if (questionLower.includes('trung học')) {
        conversationState = {
          step: 'block_selected',
          selectedBlock: 'Trung học',
          positions: [
            'Trưởng bộ môn',
            'Giáo viên Ngữ Văn',
            'Giáo viên Toán',
            'Giáo viên Khoa học Tự nhiên',
            'Giáo viên Khoa học Xã hội',
            'Giáo viên STEM',
            'Giáo viên Nghệ thuật',
            'Giáo viên Thể chất'
          ]
        };
      } else if (questionLower.includes('chuyên biệt')) {
        conversationState = {
          step: 'block_selected',
          selectedBlock: 'Vị trí chuyên biệt',
          positions: [
            'Giáo viên SEL',
            'Tổng quản nhiệm',
            'Điều phối viên SWAN'
          ]
        };
      }

      // Tạo response dựa trên state
      if (conversationState.step === 'initial') {
        selectedPrompt = `${PROMPTS.BASE_PROMPT}
        
Xin chào! Vui lòng cho biết bạn muốn tìm hiểu về giáo viên ở khối nào:
1️⃣ Khối Mầm non
2️⃣ Khối Tiểu học
3️⃣ Khối Trung học
4️⃣ Vị trí chuyên biệt`;
      } else if (conversationState.step === 'block_selected') {
        selectedPrompt = `${PROMPTS.BASE_PROMPT}

Trong khối ${conversationState.selectedBlock} có các vị trí giáo viên sau:
${conversationState.positions.map(pos => `- ${pos}`).join('\n')}

Vui lòng chọn vị trí bạn muốn biết thông tin giáo viên.`;
      }
    } else if (questionLower.startsWith('thông tin ')) {
      // Xử lý khi user muốn biết thông tin chi tiết về giáo viên
      const teacherName = questionLower.replace('thông tin ', '').trim();
      selectedPrompt = PROMPTS.TEACHER_INFO;
      conversationState.step = 'teacher_selected';
    } else {
      // Xử lý các câu hỏi khác
      if (questionLower.includes('học phí')) {
        selectedPrompt = PROMPTS.FEES_INFO;
      } else if (questionLower.includes('cơ sở vật chất')) {
        selectedPrompt = PROMPTS.FACILITY_INFO;
      } else if (questionLower.includes('tuyển sinh')) {
        selectedPrompt = PROMPTS.ADMISSION_INFO;
      } else {
        selectedPrompt = PROMPTS.PROGRAM_INFO;
      }
    }

    // Tìm kiếm thông tin từ MongoDB dựa trên trạng thái conversation
    const relevantChunks = await KnowledgeChunk.aggregate([
      {
        $match: {
          $text: { 
            $search: lastMessage.content,
            $caseSensitive: false,
            $diacriticSensitive: false
          }
        }
      },
      {
        $addFields: {
          score: { $meta: "textScore" },
          contentMatch: {
            $regexMatch: {
              input: "$chunk",
              regex: lastMessage.content
                .split(/\s+/)
                .filter(w => w.length > 3)
                .join("|"),
              options: "i"
            }
          }
        }
      },
      {
        $match: {
          $or: [
            { score: { $gt: 0.5 } },
            { contentMatch: true }
          ]
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: 3
      }
    ]);

    const context = relevantChunks.map(c => c.chunk).join("\n\n");

    // Cập nhật finalPrompt
    let finalPrompt = selectedPrompt;
    if (conversationState.step !== 'initial') {
      finalPrompt += `\n\nCURRENT_STATE:
- Step: ${conversationState.step}
- Selected Block: ${conversationState.selectedBlock}
${conversationState.positions ? `- Available Positions:\n${conversationState.positions.map(p => `  * ${p}`).join('\n')}` : ''}`;
    }

    finalPrompt += `\n\nTHÔNG TIN THAM KHẢO:
"""
${context}
"""

Câu hỏi: ${lastMessage.content}

Trả lời:`;

    // Gọi Gemini API
    const response = await fetch(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: finalPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(response.status).json({
        error: "Error calling Gemini API"
      });
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Invalid Gemini response:", data);
      return res.status(500).json({
        error: "Invalid response from Gemini API"
      });
    }

    res.json({
      message: data.candidates[0].content.parts[0].text
    });

  } catch (err) {
    console.error("Server error in /gemini:", err);
    res.status(500).json({ 
      error: err.message || "Internal server error"
    });
  }
});

module.exports = router