"use client"

import { useState, useEffect } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)

  // Load bots từ API
  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then(setBots)
  }, [])

  // Khi chọn bot mới, reset currentChat về null hoặc chat mới của bot đó
  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    // Lấy lịch sử chat của bot này nếu có
    const historyKey = "chatHistory"
    const allHistory = JSON.parse(localStorage.getItem(historyKey) || "[]")
    const botChat = allHistory.find(
      (c) => {
        if (!c.bot || !bot) return false;
        // So sánh theo _id nếu cả hai đều có _id
        if (c.bot._id && bot._id && c.bot._id === bot._id) return true;
        // So sánh theo id nếu cả hai đều có id
        if (c.bot.id && bot.id && c.bot.id === bot.id) return true;
        return false;
      }
    )
    if (botChat) {
      setCurrentChat(botChat)
    } else {
      setCurrentChat({
        id: Date.now(),
        bot,
        messages: [],
        title: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      })
    }
  }

  // Khi chọn lịch sử chat
  const handleSelectChat = (chat) => {
    setCurrentChat(chat)
    setSelectedBot(chat.bot)
  }

  // Khi gửi tin nhắn hoặc nhận phản hồi AI
  const handleChatUpdate = (chat) => {
    setCurrentChat(chat)
  }

  const handleReset = () => {
    setCurrentChat(null)
    setSelectedBot(null)
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r flex flex-col">
        <BotSelector
          bots={bots}
          selectedBot={selectedBot}
          onSelectBot={handleSelectBot}
          onNewChat={() => handleSelectBot(selectedBot)}
        />
        <ChatHistory
          selectedBot={selectedBot}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
        />
      </div>
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Thanh tiêu đề cố định */}
        <div className="flex items-center justify-between px-6 py-4 bg-white shadow z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedBot ? selectedBot.name : "Chọn ChatBot"}
          </h2>
          <button
            onClick={handleReset}
            className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition font-semibold shadow"
          >
            Reset
          </button>
        </div>
        {/* Nội dung chat cuộn, tiêu đề KHÔNG cuộn */}
        <div className="flex-1 overflow-y-auto">
          <ChatInterface
            bot={selectedBot}
            chat={currentChat}
            onChatUpdate={handleChatUpdate}
          />
        </div>
      </div>
    </div>
  )
}
