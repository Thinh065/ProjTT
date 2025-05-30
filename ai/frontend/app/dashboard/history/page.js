"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function HistoryPage() {
  const [chatHistory, setChatHistory] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBot, setSelectedBot] = useState("all")
  const [filteredHistory, setFilteredHistory] = useState([])

  const bots = [
    { id: "all", name: "Tất cả", color: "bg-gray-500" },
    { id: "gpt-4", name: "GPT-4", color: "bg-green-500" },
    { id: "claude", name: "Claude", color: "bg-orange-500" },
    { id: "gemini", name: "Gemini", color: "bg-blue-500" },
    { id: "llama", name: "Llama 2", color: "bg-purple-500" },
  ]

  useEffect(() => {
    // Mock chat history data
    const mockHistory = [
      {
        id: 1,
        title: "Hỏi về lập trình React",
        bot: { id: "gpt-4", name: "GPT-4", color: "bg-green-500" },
        lastMessage: "Cảm ơn bạn đã giải thích!",
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T11:45:00Z",
        messageCount: 8,
        preview: "Tôi muốn học React từ đầu, bạn có thể hướng dẫn tôi không?",
      },
      {
        id: 2,
        title: "Tư vấn thiết kế UI/UX",
        bot: { id: "claude", name: "Claude", color: "bg-orange-500" },
        lastMessage: "Tôi sẽ thử áp dụng những gợi ý này.",
        createdAt: "2024-01-14T15:45:00Z",
        updatedAt: "2024-01-14T16:20:00Z",
        messageCount: 12,
        preview: "Làm thế nào để thiết kế một giao diện người dùng thân thiện?",
      },
      {
        id: 3,
        title: "Học machine learning",
        bot: { id: "gemini", name: "Gemini", color: "bg-blue-500" },
        lastMessage: "Bạn có thể giải thích thêm về neural networks không?",
        createdAt: "2024-01-13T09:20:00Z",
        updatedAt: "2024-01-13T10:15:00Z",
        messageCount: 15,
        preview: "Tôi muốn bắt đầu học machine learning, nên bắt đầu từ đâu?",
      },
      {
        id: 4,
        title: "Tối ưu hóa database",
        bot: { id: "gpt-4", name: "GPT-4", color: "bg-green-500" },
        lastMessage: "Index này sẽ giúp tăng tốc độ query đáng kể.",
        createdAt: "2024-01-12T14:30:00Z",
        updatedAt: "2024-01-12T15:45:00Z",
        messageCount: 6,
        preview: "Database của tôi chạy chậm, làm sao để tối ưu hóa?",
      },
      {
        id: 5,
        title: "Viết content marketing",
        bot: { id: "claude", name: "Claude", color: "bg-orange-500" },
        lastMessage: "Bài viết này rất hay, cảm ơn bạn!",
        createdAt: "2024-01-11T11:15:00Z",
        updatedAt: "2024-01-11T12:30:00Z",
        messageCount: 10,
        preview: "Tôi cần viết content cho chiến dịch marketing, bạn có thể giúp không?",
      },
    ]

    setChatHistory(mockHistory)
  }, [])

  useEffect(() => {
    let filtered = chatHistory

    // Filter by bot
    if (selectedBot !== "all") {
      filtered = filtered.filter((chat) => chat.bot.id === selectedBot)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (chat) =>
          chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.preview.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredHistory(filtered)
  }, [chatHistory, selectedBot, searchTerm])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDeleteChat = (chatId) => {
    if (confirm("Bạn có chắc muốn xóa cuộc trò chuyện này?")) {
      setChatHistory(chatHistory.filter((chat) => chat.id !== chatId))
    }
  }

  const handleExportChat = (chat) => {
    // Mock export functionality
    const exportData = {
      title: chat.title,
      bot: chat.bot.name,
      createdAt: chat.createdAt,
      messageCount: chat.messageCount,
      preview: chat.preview,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `chat-${chat.id}.json`
    link.click()
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Lịch sử trò chuyện</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
            />
            <Input
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Bot Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {bots.map((bot) => (
          <Button
            key={bot.id}
            variant={selectedBot === bot.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBot(bot.id)}
            className="flex items-center space-x-2"
          >
            {bot.id !== "all" && <div className={cn("w-3 h-3 rounded-full", bot.color)} />}
            <span>{bot.name}</span>
          </Button>
        ))}
      </div>

      {/* Chat History Grid */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <Icon icon="mdi:chat-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            {searchTerm || selectedBot !== "all" ? "Không tìm thấy cuộc trò chuyện" : "Chưa có lịch sử trò chuyện"}
          </h2>
          <p className="text-gray-500">
            {searchTerm || selectedBot !== "all"
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
              : "Bắt đầu trò chuyện với ChatBot AI để xem lịch sử ở đây"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((chat) => (
            <Card key={chat.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        chat.bot.color,
                      )}
                    >
                      <Icon icon="mdi:robot" className="w-3 h-3 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium truncate">{chat.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {chat.bot.name}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => handleExportChat(chat)} className="h-8 w-8 p-0">
                      <Icon icon="mdi:download" className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChat(chat.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Icon icon="mdi:delete" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3 line-clamp-2">{chat.preview}</CardDescription>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{chat.messageCount} tin nhắn</span>
                  <span>{formatDate(chat.updatedAt)}</span>
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    <Icon icon="mdi:eye" className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
