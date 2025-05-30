"use client"

import { useState, useEffect } from "react"
import ChatInterface from "@/components/chat/ChatInterface"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"

export default function DashboardPage() {
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const bots = [
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "Mô hình AI tiên tiến nhất của OpenAI",
      icon: "simple-icons:openai",
      color: "bg-green-500",
    },
    {
      id: "claude",
      name: "Claude",
      description: "AI Assistant thông minh từ Anthropic",
      icon: "simple-icons:anthropic",
      color: "bg-orange-500",
    },
    {
      id: "gemini",
      name: "Gemini",
      description: "AI đa phương thức từ Google",
      icon: "simple-icons:google",
      color: "bg-blue-500",
    },
    {
      id: "llama",
      name: "Llama 2",
      description: "Mô hình mã nguồn mở từ Meta",
      icon: "simple-icons:meta",
      color: "bg-purple-500",
    },
  ]

  useEffect(() => {
    if (bots.length > 0 && !selectedBot) {
      setSelectedBot(bots[0])
    }
  }, [bots, selectedBot])

  const handleNewChat = () => {
    setCurrentChat({
      id: Date.now(),
      title: "Cuộc trò chuyện mới",
      bot: selectedBot,
      messages: [],
      createdAt: new Date(),
    })
  }

  return (
    <div className="flex h-full">
      {/* Bot Selector */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <BotSelector bots={bots} selectedBot={selectedBot} onSelectBot={setSelectedBot} onNewChat={handleNewChat} />
        <ChatHistory selectedBot={selectedBot} currentChat={currentChat} onSelectChat={setCurrentChat} />
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        {selectedBot ? (
          <ChatInterface bot={selectedBot} chat={currentChat} onChatUpdate={setCurrentChat} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Chọn một ChatBot để bắt đầu</h2>
              <p className="text-gray-500">Chọn một trong các ChatBot AI để bắt đầu cuộc trò chuyện</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
