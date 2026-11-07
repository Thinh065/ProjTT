"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import BotSelector, { ESH_BOT } from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"
import { apiFetch } from "@/lib/api"

const NEW_CHAT_TITLE = "Cuộc trò chuyện mới"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  const [editingTitle, setEditingTitle] = useState("")
  const [editingChat, setEditingChat] = useState(null)

  // Đọc botId/chatId từ URL một lần khi vào trang
  const urlParams = useRef(null)
  if (urlParams.current === null && typeof window !== "undefined") {
    const sp = new URLSearchParams(window.location.search)
    urlParams.current = { botId: sp.get("botId"), chatId: sp.get("chatId") }
  }

  // Lấy danh sách ChatBot
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { ok, data } = await apiFetch("/api/apikeys")
      if (cancelled) return
      const visibleBots = ok && Array.isArray(data) ? data.filter((b) => !b.hidden) : []
      setBots(visibleBots)

      const allBots = [ESH_BOT, ...visibleBots]
      const wantedId = urlParams.current?.botId || localStorage.getItem("currentBotId")
      setSelectedBot(allBots.find((b) => b._id === wantedId) || allBots[0])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Mở chi tiết một cuộc trò chuyện
  const openChat = useCallback(async (chatId) => {
    const { ok, data } = await apiFetch(`/api/chat/history/${chatId}`)
    if (ok && data.chat) {
      setCurrentChat(data.chat)
      localStorage.setItem("currentChatId", data.chat.id)
    }
  }, [])

  // Khi đổi bot: tải lịch sử của bot đó từ server
  useEffect(() => {
    if (!selectedBot) {
      setChatHistory([])
      setCurrentChat(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const { ok, data } = await apiFetch(
        `/api/chat/history?botId=${encodeURIComponent(selectedBot._id)}`
      )
      if (cancelled) return
      const chats = ok ? data.chats || [] : []
      setChatHistory(chats)

      // Ưu tiên chatId trên URL (chỉ lần đầu), sau đó là chat đang mở gần nhất
      const urlChatId = urlParams.current?.chatId
      if (urlParams.current) urlParams.current.chatId = null
      const lastChatId = localStorage.getItem("currentChatId")
      const target =
        chats.find((c) => c.id === urlChatId) || chats.find((c) => c.id === lastChatId) || chats[0]

      if (target) await openChat(target.id)
      else setCurrentChat(null)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedBot, openChat])

  const handleNewChat = () => {
    if (!selectedBot) return
    // Chỉ tạo ở client; được lưu lên server khi gửi tin nhắn đầu tiên
    setCurrentChat({ id: null, title: NEW_CHAT_TITLE, botId: selectedBot._id, messages: [] })
  }

  // Được ChatInterface gọi 2 lần: khi gửi (persist=false) và khi có trả lời (persist=true)
  const handleChatUpdate = async (updatedChat, { persist } = {}) => {
    setCurrentChat(updatedChat)
    if (!persist) return

    const { ok, data } = await apiFetch("/api/chat/history/save", {
      method: "POST",
      body: {
        id: updatedChat.id || undefined,
        botId: selectedBot._id,
        botName: selectedBot.name,
        title: updatedChat.title,
        messages: updatedChat.messages,
      },
    })
    if (!ok || !data.chat) {
      showConfirm({ message: data?.message || "Không lưu được lịch sử chat", onlyClose: true })
      return
    }
    const saved = data.chat
    setCurrentChat(saved)
    localStorage.setItem("currentChatId", saved.id)
    setChatHistory((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)])
  }

  // ChatHistory đã hỏi xác nhận trước khi gọi hàm này
  const handleDeleteChat = async (chatId) => {
    if (chatId) {
      const { ok, data } = await apiFetch(`/api/chat/history/${chatId}`, { method: "DELETE" })
      if (!ok) {
        showConfirm({ message: data?.message || "Không xóa được", onlyClose: true })
        return
      }
    }
    const newHistory = chatHistory.filter((c) => c.id !== chatId)
    setChatHistory(newHistory)
    if (currentChat?.id === chatId) {
      if (newHistory[0]) openChat(newHistory[0].id)
      else setCurrentChat(null)
    }
  }

  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    localStorage.setItem("currentBotId", bot._id)
  }

  const handleSelectChat = (chat) => {
    if (chat.id && chat.id !== currentChat?.id) openChat(chat.id)
  }

  const handleEditTitle = () => {
    setEditingTitle(currentChat?.title || "")
    setEditingChat(currentChat?.id ?? "new")
  }

  const handleSaveTitle = async () => {
    const title = editingTitle.trim()
    setEditingChat(null)
    setEditingTitle("")
    if (!currentChat || !title) return

    if (currentChat.id) {
      const { ok, data } = await apiFetch(`/api/chat/history/${currentChat.id}`, {
        method: "PUT",
        body: { title },
      })
      if (!ok) {
        showConfirm({ message: data?.message || "Không đổi được tên", onlyClose: true })
        return
      }
      setChatHistory((prev) => prev.map((c) => (c.id === currentChat.id ? { ...c, title } : c)))
    }
    setCurrentChat({ ...currentChat, title })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  const isEditing = currentChat && editingChat === (currentChat.id ?? "new")

  return (
    <div className="flex h-full">
      {/* Bot Selector */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <BotSelector bots={bots} selectedBot={selectedBot} onSelectBot={handleSelectBot} />
        <ChatHistory
          selectedBot={selectedBot}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
          chats={chatHistory}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedBot && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-lg">{selectedBot.name}</span>
              {currentChat && (
                <div className="flex items-center gap-2 ml-4 min-w-0">
                  {isEditing ? (
                    <>
                      <input
                        className="border px-2 py-1 rounded text-sm"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle()
                          if (e.key === "Escape") setEditingChat(null)
                        }}
                        autoFocus
                      />
                      <button className="text-green-600 px-1" onClick={handleSaveTitle} title="Lưu">
                        ✔
                      </button>
                      <button className="text-gray-500 px-1" onClick={() => setEditingChat(null)} title="Hủy">
                        ✖
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-medium truncate">{currentChat.title}</span>
                      <button className="text-blue-600 px-1" onClick={handleEditTitle} title="Đổi tên">
                        ✎
                      </button>
                      {currentChat.totalTokens > 0 && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {currentChat.totalTokens} tokens
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition whitespace-nowrap"
              onClick={handleNewChat}
            >
              + Tạo chat mới
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {selectedBot ? (
            <ChatInterface
              key={`${selectedBot._id}-${currentChat?.id || "new"}`}
              bot={selectedBot}
              chat={currentChat}
              onChatUpdate={handleChatUpdate}
            />
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
      {ConfirmDialog}
    </div>
  )
}
