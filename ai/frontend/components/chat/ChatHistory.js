"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function ChatHistory({ selectedBot, currentChat, onSelectChat }) {
  const [chatHistory, setChatHistory] = useState([])

  useEffect(() => {
    // Mock chat history - thay thế bằng API call thực tế
    const mockHistory = [
      {
        id: 1,
        title: "Hỏi về lập trình React",
        bot: { id: "gpt-4", name: "GPT-4" },
        lastMessage: "Cảm ơn bạn đã giải thích!",
        updatedAt: "2024-01-15T10:30:00Z",
        messageCount: 8,
      },
      {
        id: 2,
        title: "Tư vấn thiết kế UI/UX",
        bot: { id: "claude", name: "Claude" },
        lastMessage: "Tôi sẽ thử áp dụng những gợi ý này.",
        updatedAt: "2024-01-14T15:45:00Z",
        messageCount: 12,
      },
      {
        id: 3,
        title: "Học machine learning",
        bot: { id: "gemini", name: "Gemini" },
        lastMessage: "Bạn có thể giải thích thêm về neural networks không?",
        updatedAt: "2024-01-13T09:20:00Z",
        messageCount: 15,
      },
    ]

    // Filter by selected bot if any
    const filteredHistory = selectedBot ? mockHistory.filter((chat) => chat.bot.id === selectedBot.id) : mockHistory

    setChatHistory(filteredHistory)
  }, [selectedBot])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Hôm qua"
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString("vi-VN")
  }

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation()
    if (confirm("Bạn có chắc muốn xóa cuộc trò chuyện này?")) {
      setChatHistory(chatHistory.filter((chat) => chat.id !== chatId))
      if (currentChat?.id === chatId) {
        onSelectChat(null)
      }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Lịch sử trò chuyện
          {selectedBot && ` - ${selectedBot.name}`}
        </h3>

        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="mdi:chat-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors group",
                  currentChat?.id === chat.id ? "bg-blue-50 border-blue-200" : "border-gray-200",
                )}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{chat.title}</h4>
                    <p className="text-xs text-gray-500 truncate mt-1">{chat.lastMessage}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{formatDate(chat.updatedAt)}</span>
                      <span className="text-xs text-gray-400">{chat.messageCount} tin nhắn</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                  >
                    <Icon icon="mdi:delete" className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
