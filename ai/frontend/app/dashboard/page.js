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
  // Trên điện thoại, cột bot + lịch sử là ngăn kéo trượt ra
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const openChat = useCallback(async (chatId, isCancelled = () => false) => {
    const { ok, data } = await apiFetch(`/api/chat/history/${chatId}`)
    if (isCancelled()) return
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

      if (target) await openChat(target.id, () => cancelled)
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
    setSidebarOpen(false)
  }

  const handleSelectChat = (chat) => {
    if (chat.id && chat.id !== currentChat?.id) openChat(chat.id)
    setSidebarOpen(false)
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
      <div className="flex items-center justify-center h-full bg-[#fbfaff]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#7c3aed] mx-auto mb-4"></div>
          <div className="text-[#5d566f] text-sm font-medium">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  const isEditing = currentChat && editingChat === (currentChat.id ?? "new")

  return (
    <div className="relative flex h-full text-[#1d1530]">
      {/* Lớp tối phía sau ngăn kéo (chỉ điện thoại) */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng danh sách bot"
          className="fixed inset-0 z-30 bg-[#1d1530]/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Bot Selector: cột cố định trên máy tính, ngăn kéo trên điện thoại */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[86vw] max-w-80 bg-[rgba(255,255,255,0.88)] backdrop-blur-xl border-r border-[rgba(76,29,149,0.12)] flex flex-col transition-transform duration-200 md:static md:z-auto md:w-80 md:max-w-none md:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]" : "-translate-x-full"
        }`}
      >
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
          <div className="flex items-center justify-between gap-2 px-3 md:px-5 py-3 border-b border-[rgba(76,29,149,0.12)] bg-[rgba(255,255,255,0.82)] backdrop-blur-md">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                type="button"
                className="md:hidden -ml-1 p-2 rounded-[10px] text-[#1d1530] hover:bg-[#f1edff] transition"
                aria-label="Mở danh sách bot và lịch sử"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </svg>
              </button>
              <span className="font-semibold text-base text-[#1d1530] truncate">{selectedBot.name}</span>
              {currentChat && (
                <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2 min-w-0">
                  {isEditing ? (
                    <>
                      <input
                        className="border border-[rgba(124,58,237,0.34)] bg-white text-[#1d1530] px-2.5 py-1 rounded-[10px] text-xs focus:ring-2 focus:ring-[#7c3aed]/25 focus:border-[#7c3aed] focus:outline-none min-w-0 w-32 sm:w-48"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle()
                          if (e.key === "Escape") setEditingChat(null)
                        }}
                        autoFocus
                      />
                      <button
                        className="text-[#7c3aed] hover:text-[#6d28d9] hover:bg-[#f1edff] px-1.5 py-0.5 rounded text-xs font-bold"
                        onClick={handleSaveTitle}
                        title="Lưu"
                      >
                        ✔
                      </button>
                      <button
                        className="text-[#5d566f] hover:text-[#be123c] hover:bg-[#fff1f2] px-1.5 py-0.5 rounded text-xs"
                        onClick={() => setEditingChat(null)}
                        title="Hủy"
                      >
                        ✖
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline text-xs text-[#5d566f] font-normal truncate max-w-xs">
                        / {currentChat.title}
                      </span>
                      <button
                        className="text-[#5d566f] hover:text-[#7c3aed] hover:bg-[#f1edff] px-1.5 py-0.5 rounded text-xs transition"
                        onClick={handleEditTitle}
                        title="Đổi tên"
                      >
                        ✎
                      </button>
                      {currentChat.totalTokens > 0 && (
                        <span className="text-[10px] font-mono font-medium text-[#5b21b6] bg-[#f1edff] px-2 py-0.5 rounded-full border border-[rgba(124,58,237,0.22)] whitespace-nowrap">
                          {currentChat.totalTokens} tokens
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              className="bg-[#7c3aed] text-white text-xs font-medium px-3.5 py-2 rounded-[11px] hover:bg-[#6d28d9] transition flex items-center gap-1.5 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] whitespace-nowrap"
              onClick={handleNewChat}
              aria-label="Tạo chat mới"
            >
              <span>
                +<span className="hidden sm:inline"> Tạo chat mới</span>
              </span>
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
                <div className="text-[#7c3aed]/50 text-6xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold text-[#1d1530] mb-2">Chưa có ChatBot nào</h2>
                <p className="text-[#5d566f]">Hãy thêm ChatBot AI trong trang quản trị để bắt đầu sử dụng</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  )
}
