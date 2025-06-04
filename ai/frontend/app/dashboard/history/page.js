"use client"

import { useEffect, useState } from "react"
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
  const [bots, setBots] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])

  useEffect(() => {
    // Đọc đúng key theo bot
    const historyKey = selectedBot === "all"
      ? "chatHistory"
      : `chatHistory_${selectedBot}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    setChatHistory(history);
  }, [selectedBot])

  useEffect(() => {
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then(setBots);
  }, []);

  useEffect(() => {
    let filtered = chatHistory

    // Lọc theo bot đã chọn
    if (selectedBot !== "all") {
      filtered = filtered.filter(
        (chat) =>
          chat.bot &&
          (chat.bot._id === selectedBot || chat.bot.id === selectedBot)
      )
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
      filtered = filtered.filter(
        (chat) =>
          chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.preview?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Lọc chỉ các bot còn tồn tại
    filtered = filtered.filter(
      (chat) =>
        chat.bot &&
        bots.some((bot) => bot._id === (chat.bot._id || chat.bot.id))
    )

    setFilteredHistory(filtered)
  }, [chatHistory, selectedBot, searchTerm, bots])

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
      const historyKey = selectedBot === "all" ? "chatHistory" : `chatHistory_${selectedBot}`;
      const newHistory = chatHistory.filter((chat) => chat.id !== chatId);
      setChatHistory(newHistory);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
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
        <Button
          key="all"
          variant={selectedBot === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedBot("all")}
        >
          Tất cả
        </Button>
        {bots.map((bot) => (
          <Button
            key={bot._id}
            variant={selectedBot === bot._id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBot(bot._id)}
            className="flex items-center space-x-2"
          >
            <span>{bot.name}</span>
          </Button>
        ))}
      </div>

      <h3 className="text-xl font-semibold mb-4">
        Lịch sử trò chuyện - {selectedBot !== "all" ? bots.find(bot => bot._id === selectedBot)?.name : "Tất cả"}
      </h3>

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
          {filteredHistory.map((chat, idx) => (
            <Card key={chat.id || chat._id || idx} className="hover:shadow-lg transition-shadow">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      localStorage.setItem("currentChat", JSON.stringify(chat));
                      window.location.href = "/dashboard";
                    }}
                  >
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
