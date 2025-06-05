"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChatSidebar from "@/components/chat/ChatSidebar"
import ChatInterface from "@/components/chat/ChatInterface"

export default function Home() {
  const router = useRouter()
  const [chats, setChats] = useState([]) // Lưu lịch sử chat
  const [currentChat, setCurrentChat] = useState(null)

  useEffect(() => {
    // Kiểm tra authentication status
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/dashboard")
    } else {
      router.push("/auth/login")
    }
  }, [router])

  // Tạo chat mới
  const handleNewChat = () => {
    if (currentChat && currentChat.messages.length > 0) {
      setChats((prev) => [...prev, { ...currentChat, id: Date.now() }])
    }
    setCurrentChat({ id: Date.now(), messages: [], title: "Cuộc trò chuyện mới" })
  }

  // Chọn chat từ lịch sử
  const handleSelectChat = (id) => {
    const chat = chats.find((c) => c.id === id)
    if (chat) setCurrentChat(chat)
  }

  // Cập nhật chat hiện tại
  const handleChatUpdate = (chat) => {
    setCurrentChat(chat)
  }

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        selectedChatId={currentChat?.id}
      />
      <div className="flex-1">
        <ChatInterface
          chat={currentChat}
          onChatUpdate={handleChatUpdate}
          // ...các props khác
        />
      </div>
      <div className="flex items-center justify-end p-4 border-b">
        <button
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition"
          onClick={handleNewChat}
        >
          Chat mới
        </button>
      </div>
    </div>
  )
}
