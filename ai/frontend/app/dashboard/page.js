"use client"

import { useEffect, useState } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  // Lấy danh sách ChatBot từ backend
  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then((data) => {
        // Lọc bot chưa bị ẩn
        const visibleBots = data.filter(b => !b.hidden)
        setBots(visibleBots)
        // Ưu tiên lấy botId/chatId từ localStorage nếu có
        const botId = localStorage.getItem("currentBotId");
        let bot = null;
        if (botId) {
          bot = visibleBots.find(b => b._id === botId || b.id === botId);
        }
        if (bot) {
          setSelectedBot(bot);
        } else if (visibleBots.length > 0) {
          setSelectedBot(visibleBots[0]);
        }
      })
  }, [])

  // Khi đổi bot, đọc lịch sử chat từ localStorage
  useEffect(() => {
    if (!selectedBot) {
      setChatHistory([])
      setCurrentChat(null)
      return
    }
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${botKey}`
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]")

    // Ưu tiên lấy chat từ localStorage nếu có
    let chat = null
    const chatData = localStorage.getItem("currentChat")
    if (chatData) {
      try {
        const parsed = JSON.parse(chatData)
        chat = history.find(c => String(c.id) === String(parsed.id))
        setChatHistory(history)
        setCurrentChat(chat || history[0] || null)
        return
      } catch {}
    }
    setChatHistory(history)
    setCurrentChat(history[0] || null)
  }, [selectedBot])

  // Khi tạo chat mới
  const handleNewChat = () => {
    if (!selectedBot) return
    const newChat = {
      id: Date.now(),
      title: "Cuộc trò chuyện mới",
      bot: selectedBot,
      messages: [],
      createdAt: new Date(),
    }
    setCurrentChat(newChat)
    setChatHistory([newChat, ...chatHistory])
    // Lưu vào localStorage
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${botKey}`
    localStorage.setItem(historyKey, JSON.stringify([newChat, ...chatHistory]))
  }

  // Khi cập nhật chat (gửi tin nhắn mới)
  const handleChatUpdate = (updatedChat) => {
    setCurrentChat(updatedChat)
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${botKey}`
    const newHistory = [updatedChat, ...chatHistory.filter(c => c.id !== updatedChat.id)]
    setChatHistory(newHistory)
    localStorage.setItem(historyKey, JSON.stringify(newHistory))
  }

  const handleDeleteChat = (chatId) => {
    const newHistory = chatHistory.filter((chat) => chat.id !== chatId)
    setChatHistory(newHistory)
    // Xóa trong localStorage
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${botKey}`
    localStorage.setItem(historyKey, JSON.stringify(newHistory))
    // Nếu chat hiện tại bị xóa thì bỏ chọn
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(newHistory[0] || null)
    }
  }

  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    localStorage.setItem("currentBotId", bot._id || bot.id)
  }

  const handleSelectChat = (chat) => {
    setCurrentChat(chat)
    localStorage.setItem("currentChat", JSON.stringify(chat))
  }

  return (
    <div className="flex h-full">
      {/* Bot Selector */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <BotSelector
          bots={bots}
          selectedBot={selectedBot}
          onSelectBot={handleSelectBot}
        />
        <ChatHistory
          selectedBot={selectedBot}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
          chats={chatHistory}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header ChatBot */}
        {selectedBot && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedBot.color}`}>
                {/* Nếu có icon */}
                {selectedBot.icon && (
                  <span className="text-white text-xl">
                    <i className={selectedBot.icon}></i>
                  </span>
                )}
              </div>
              <span className="font-semibold text-lg">{selectedBot.name}</span>
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
              onClick={handleNewChat}
            >
              + Tạo chat mới
            </button>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          {selectedBot ? (
            <ChatInterface bot={selectedBot} chat={currentChat} onChatUpdate={handleChatUpdate} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Chưa có ChatBot nào</h2>
                <p className="text-gray-500">Hãy thêm ChatBot AI trong trang quản trị để bắt đầu sử dụng</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
