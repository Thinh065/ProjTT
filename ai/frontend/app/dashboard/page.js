"use client"

import { useState, useEffect } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"
import { Icon } from "@iconify/react"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  // Load bots từ API
  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then(setBots)
  }, [])

  // Load lịch sử chat từ localStorage
  useEffect(() => {
    const allHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]")
    setChatHistory(allHistory)
  }, [])

  // Lưu lịch sử chat vào localStorage khi chatHistory thay đổi
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory))
  }, [chatHistory])

  // Khi chọn bot mới, lấy chat gần nhất với bot đó hoặc tạo chat mới
  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    const botChats = chatHistory.filter(
      (c) => c.bot && ((c.bot._id && bot._id && c.bot._id === bot._id) || (c.bot.id && bot.id && c.bot.id === bot.id))
    )
    if (botChats.length > 0) {
      setCurrentChat(botChats[botChats.length - 1])
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
    // Cập nhật vào lịch sử (nếu đã có id)
    setChatHistory((prev) => {
      const filtered = prev.filter((c) => c.id !== chat.id)
      return [...filtered, chat]
    })
  }

  // Xử lý nút "Chat mới"
  const handleNewChat = () => {
    // Lưu chat hiện tại vào lịch sử nếu có tin nhắn
    if (currentChat && currentChat.messages && currentChat.messages.length > 0) {
      setChatHistory((prev) => {
        const filtered = prev.filter((c) => c.id !== currentChat.id)
        return [...filtered, currentChat]
      })
    }
    // Tạo chat mới rỗng với bot đang chọn
    setCurrentChat({
      id: Date.now(),
      bot: selectedBot,
      messages: [],
      title: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    })
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r flex flex-col">
        <BotSelector
          bots={bots}
          selectedBot={selectedBot}
          onSelectBot={handleSelectBot}
        />
        <ChatHistory
          selectedBot={selectedBot}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
          chatHistory={chatHistory}
        />
      </div>
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Thanh tiêu đề cố định */}
        <div className="flex items-center justify-between px-6 py-4 bg-white shadow z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedBot ? selectedBot.name : "Chọn ChatBot"}
          </h2>
          {selectedBot && (
            <button
              onClick={handleNewChat}
              className="ml-4 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded transition font-semibold shadow flex items-center"
            >
              <Icon icon="mdi:plus" className="w-4 h-4 mr-2" />
              Chat mới
            </button>
          )}
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
