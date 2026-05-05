const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// Log middleware để debug
router.use((req, res, next) => {
  console.log("History Route:", {
    method: req.method,
    path: req.path,
    headers: req.headers,
  });
  next();
});

// Lấy lịch sử chat từ ChromaDB
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const histories = await getChromaHistory(userId);
    res.json({ chats: histories });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử từ ChromaDB:", error);
    res.status(500).json({ error: "Không thể lấy lịch sử chat" });
  }
});

// Lưu lịch sử chat vào ChromaDB
router.post("/save", auth, async (req, res) => {
  try {
    const { botId, title, messages } = req.body;
    const userId = req.user.id;

    await saveChromaHistory({
      userId,
      botId,
      title,
      messages,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi khi lưu vào ChromaDB:", error);
    res.status(500).json({ error: "Không thể lưu lịch sử chat" });
  }
});

module.exports = router;