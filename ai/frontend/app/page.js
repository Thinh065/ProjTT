"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChatInterface from "@/components/chat/ChatInterface"

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)

  useEffect(() => {
    // Kiểm tra authentication status và fetch dữ liệu
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/dashboard")
      return
    }
    // Nếu không có token thì fetch dữ liệu cho trang home
    async function fetchData() {
      // await fetchBots();
      // await fetchChats();
      // await fetchUser();
      setLoading(false)
    }
    fetchData()
  }, [router])

  // CHỈ render loading, không render gì khác khi loading=true
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    )
  }

  // Sau khi loading=false mới render giao diện chính
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col items-center justify-center">
        {!currentChat ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">Chọn một ChatBot</h2>
            <p className="text-gray-500">Chọn một ChatBot AI để bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          <ChatInterface
            chat={currentChat}
            onChatUpdate={setCurrentChat}
          />
        )}
      </div>
      <div className="flex items-center justify-end p-4 border-b">
        <button
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition"
          onClick={() => {
            const newChat = { id: Date.now(), messages: [] }
            setCurrentChat(newChat)
            setChats((prev) => [...prev, newChat])
          }}
        >
          Chat mới
        </button>
      </div>
    </div>
  )
}
