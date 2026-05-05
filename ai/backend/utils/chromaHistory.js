const { ChromaClient } = require('chromadb');

const CHROMA_API_KEY = process.env.CHROMA_HISTORY_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_HISTORY_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_HISTORY_DATABASE;

// Hàm lấy lịch sử chat từ ChromaDB
async function getChromaHistory(userId) {
  try {
    const collection = await getOrCreateCollection('chat_history');
    const results = await collection.query({
      queryTexts: [`user_${userId}`],
      nResults: 100
    });
    
    return results.map(item => ({
      id: item.id,
      title: item.metadata.title,
      messages: JSON.parse(item.metadata.messages),
      botId: item.metadata.botId,
      timestamp: item.metadata.timestamp
    }));
  } catch (error) {
    console.error('Lỗi khi query ChromaDB:', error);
    throw error;
  }
}

// Hàm lưu lịch sử chat vào ChromaDB
async function saveChromaHistory({ userId, botId, title, messages, timestamp }) {
  try {
    const collection = await getOrCreateCollection('chat_history');
    await collection.add({
      ids: [`chat_${Date.now()}`],
      metadatas: [{
        userId: `user_${userId}`,
        botId,
        title,
        messages: JSON.stringify(messages),
        timestamp
      }],
      documents: [title] // Dùng title làm document để search
    });
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu vào ChromaDB:', error);
    throw error;
  }
}

module.exports = {
  getChromaHistory,
  saveChromaHistory
};