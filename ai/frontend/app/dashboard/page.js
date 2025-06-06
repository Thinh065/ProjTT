"use client"

import { useState, useEffect, useRef } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"
import { Icon } from "@iconify/react"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const newChatRef = useRef(null)

  // Load bots từ API
  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then(setBots)
  }, [])

  // Load lịch sử chat và currentChat từ localStorage khi load trang
  useEffect(() => {
    // Lấy tất cả các key bắt đầu bằng 'chatHistory'
    const allKeys = Object.keys(localStorage).filter((key) => key.startsWith("chatHistory"))
    let allHistory = []
    allKeys.forEach((key) => {
      try {
        const chats = JSON.parse(localStorage.getItem(key) || "[]")
        if (Array.isArray(chats)) {
          allHistory = allHistory.concat(chats)
        }
      } catch {}
    })
    setChatHistory(allHistory)
    const savedChat = JSON.parse(localStorage.getItem("currentChat") || "null")
    if (savedChat) {
      setCurrentChat(savedChat)
      setSelectedBot(savedChat.bot)
    } else if (allHistory.length > 0) {
      // Nếu không có currentChat, lấy cuộc chat gần nhất
      setCurrentChat(allHistory[allHistory.length - 1])
      setSelectedBot(allHistory[allHistory.length - 1].bot)
    }
  }, [])

  // Luôn đồng bộ chatHistory vào localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory))
  }, [chatHistory])

  // Luôn đồng bộ currentChat vào localStorage
  useEffect(() => {
    if (currentChat) {
      localStorage.setItem("currentChat", JSON.stringify(currentChat))
    }
  }, [currentChat])

  // Khi gửi tin nhắn hoặc nhận phản hồi AI
  const handleChatUpdate = (chat) => {
    setCurrentChat(chat)
    setChatHistory((prev) => {
      const filtered = prev.filter((c) => c.id !== chat.id)
      const updated = [...filtered, chat]
      localStorage.setItem("chatHistory", JSON.stringify(updated))
      return updated
    })
  }

  // Xử lý nút "Chat mới"
  const handleNewChat = () => {
    // Lưu chat hiện tại vào lịch sử nếu có tin nhắn
    if (currentChat && currentChat.messages && currentChat.messages.length > 0) {
      setChatHistory((prev) => {
        const filtered = prev.filter((c) => c.id !== currentChat.id)
        const updated = [...filtered, currentChat]
        localStorage.setItem("chatHistory", JSON.stringify(updated))
        return updated
      })
    }
    // Tạo chat mới rỗng với bot đang chọn
    const newChat = {
      id: Date.now(),
      bot: selectedBot,
      messages: [],
      title: selectedBot?.name || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    }
    setCurrentChat(newChat)
    newChatRef.current = newChat
    localStorage.setItem("currentChat", JSON.stringify(newChat))
  }

  // Khi chọn một cuộc hội thoại từ lịch sử
  const handleSelectChat = (chat) => {
    if (!chat) {
      setCurrentChat(null)
      setSelectedBot(null)
      localStorage.removeItem("currentChat")
      return
    }
    setCurrentChat(chat)
    setSelectedBot(chat.bot)
    newChatRef.current = null
    localStorage.setItem("currentChat", JSON.stringify(chat))
  }

  // Khi chọn bot mới, lấy chat gần nhất với bot đó hoặc tạo chat mới nếu vừa bấm "Chat mới"
  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    if (
      newChatRef.current &&
      newChatRef.current.bot &&
      (newChatRef.current.bot.id === bot.id || newChatRef.current.bot._id === bot._id)
    ) {
      setCurrentChat(newChatRef.current)
      localStorage.setItem("currentChat", JSON.stringify(newChatRef.current))
      return
    }
    const botChats = chatHistory.filter(
      (c) =>
        c.bot &&
        ((c.bot._id && bot._id && c.bot._id === bot._id) ||
          (c.bot.id && bot.id && c.bot.id === bot.id))
    )
    if (botChats.length > 0) {
      setCurrentChat(botChats[botChats.length - 1])
      localStorage.setItem("currentChat", JSON.stringify(botChats[botChats.length - 1]))
    } else {
      const emptyChat = {
        id: Date.now(),
        bot,
        messages: [],
        title: bot.name || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      }
      setCurrentChat(emptyChat)
      localStorage.setItem("currentChat", JSON.stringify(emptyChat))
    }
    newChatRef.current = null
  }

  const handleDeleteChat = (chatId) => {
    // Xóa khỏi state
    const newHistory = chatHistory.filter((chat) => chat.id !== chatId)
    setChatHistory(newHistory)
    // Xóa khỏi "chatHistory" tổng
    localStorage.setItem("chatHistory", JSON.stringify(newHistory))

    // Xóa khỏi tất cả các key chatHistory_<botId>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("chatHistory_"))
      .forEach((key) => {
        const chats = JSON.parse(localStorage.getItem(key) || "[]")
        const filtered = chats.filter((chat) => chat.id !== chatId)
        localStorage.setItem(key, JSON.stringify(filtered))
      })

    // Nếu đang xem chat vừa xóa thì reset
    if (currentChat?.id === chatId) {
      setCurrentChat(null)
      localStorage.removeItem("currentChat")
    }
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
          chats={chatHistory}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      <div className="flex-1 flex flex-col bg-gray-50">
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
