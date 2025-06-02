"use client"

import { useEffect, useState } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  // Lấy danh sách ChatBot từ backend
  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then((data) => {
        setBots(data)
        if (data.length > 0) setSelectedBot(data[0])
      })
  }, [])

  const handleNewChat = () => {
    setCurrentChat({
      id: Date.now(),
      title: "Cuộc trò chuyện mới",
      bot: selectedBot,
      messages: [],
      createdAt: new Date(),
    })
  }

  const referer = window.location.origin
  const title = document.title || "Multi ChatBot AI"

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
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Chưa có ChatBot nào</h2>
              <p className="text-gray-500">Hãy thêm ChatBot AI trong trang quản trị để bắt đầu sử dụng</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
