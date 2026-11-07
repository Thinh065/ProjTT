"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ESH_BOT } from "@/components/chat/BotSelector"
import { apiFetch, getStoredUser } from "@/lib/api"

export default function HistoryPage() {
  const [chats, setChats] = useState([])
  const [totalTokens, setTotalTokens] = useState(0)
  const [bots, setBots] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBot, setSelectedBot] = useState("all")
  const [editingChatId, setEditingChatId] = useState(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewing, setViewing] = useState(null) // chat đang xem chi tiết (dạng modal)
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  // Admin có thể xem lịch sử của user khác qua ?userId=...&name=...
  const [target, setTarget] = useState({ userId: null, name: "" })
  const [me, setMe] = useState({})
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setTarget({ userId: sp.get("userId"), name: sp.get("name") || "" })
    setMe(getStoredUser())
  }, [])
  const isOtherUser = !!target.userId && target.userId !== me._id

  useEffect(() => {
    apiFetch("/api/apikeys").then(({ ok, data }) => setBots([ESH_BOT, ...(ok && Array.isArray(data) ? data : [])]))
  }, [])

  useEffect(() => {
    if (!me._id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const qs = target.userId ? `?userId=${encodeURIComponent(target.userId)}` : ""
      const { ok, data } = await apiFetch(`/api/chat/history${qs}`)
      if (cancelled) return
      if (ok) {
        setChats(data.chats || [])
        setTotalTokens(data.totalTokens || 0)
        setError("")
      } else {
        setChats([])
        setError(data?.message || "Không tải được lịch sử")
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [target.userId, me._id])

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return chats.filter(
      (c) =>
        (selectedBot === "all" || c.botId === selectedBot) &&
        (!term || c.title?.toLowerCase().includes(term) || c.lastMessage?.toLowerCase().includes(term))
    )
  }, [chats, selectedBot, searchTerm])

  const botName = (chat) => bots.find((b) => b._id === chat.botId)?.name || chat.botName || "Bot đã xóa"

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : ""

  const handleDeleteChat = (chatId) => {
    showConfirm({
      message: "Bạn có chắc muốn xóa cuộc trò chuyện này?",
      onConfirm: async () => {
        const { ok, data } = await apiFetch(`/api/chat/history/${chatId}`, { method: "DELETE" })
        if (ok) setChats((prev) => prev.filter((c) => c.id !== chatId))
        else showConfirm({ message: data?.message || "Không xóa được", onlyClose: true })
      },
    })
  }

  const fetchFullChat = async (chatId) => {
    const { ok, data } = await apiFetch(`/api/chat/history/${chatId}`)
    if (!ok) {
      showConfirm({ message: data?.message || "Không tải được cuộc trò chuyện", onlyClose: true })
      return null
    }
    return data.chat
  }

  const handleExportChat = async (chat) => {
    const full = await fetchFullChat(chat.id)
    if (!full) return
    const exportData = {
      title: full.title,
      bot: botName(full),
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
      totalTokens: full.totalTokens,
      messages: full.messages.map(({ role, content, timestamp, tokens }) => ({ role, content, timestamp, tokens })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `chat-${full.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleView = async (chat) => {
    const full = await fetchFullChat(chat.id)
    if (full) setViewing(full)
  }

  const handleSaveEdit = async (chat) => {
    const title = editingTitle.trim()
    setEditingChatId(null)
    setEditingTitle("")
    if (!title || title === chat.title) return
    const { ok, data } = await apiFetch(`/api/chat/history/${chat.id}`, { method: "PUT", body: { title } })
    if (ok) setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, title } : c)))
    else showConfirm({ message: data?.message || "Không đổi được tên", onlyClose: true })
  }

  if (loading) return <div className="p-6">Đang tải lịch sử...</div>

  const botsInHistory = bots.filter((b) => chats.some((c) => c.botId === b._id))

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isOtherUser ? `Lịch sử của ${target.name || "người dùng"}` : "Lịch sử trò chuyện"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {chats.length} cuộc trò chuyện · Tổng {totalTokens.toLocaleString("vi-VN")} tokens
            {isOtherUser && (
              <>
                {" · "}
                <Link href="/dashboard/admin" className="text-primary hover:underline">
                  Quay lại trang quản trị
                </Link>
              </>
            )}
          </p>
        </div>
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

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={selectedBot === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedBot("all")}>
          Tất cả
        </Button>
        {botsInHistory.map((bot) => (
          <Button
            key={bot._id}
            variant={selectedBot === bot._id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBot(bot._id)}
          >
            {bot.name}
          </Button>
        ))}
      </div>

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
                  <div className="min-w-0 flex-1">
                    {editingChatId === chat.id ? (
                      <input
                        className="border px-2 py-1 rounded text-sm w-full"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(chat)
                          if (e.key === "Escape") setEditingChatId(null)
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <CardTitle className="text-sm font-medium truncate">{chat.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {botName(chat)}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {editingChatId === chat.id ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(chat)}>
                          <Icon icon="mdi:check" className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingChatId(null)}>
                          <Icon icon="mdi:close" className="w-4 h-4 text-gray-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingChatId(chat.id)
                            setEditingTitle(chat.title)
                          }}
                          className="h-8 w-8 p-0"
                          title="Đổi tên"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportChat(chat)}
                          className="h-8 w-8 p-0"
                          title="Tải về JSON"
                        >
                          <Icon icon="mdi:download" className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteChat(chat.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          title="Xóa"
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3 line-clamp-2">{chat.lastMessage}</CardDescription>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{chat.messageCount} tin nhắn</span>
                  <span>{formatDate(chat.updatedAt)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <Icon icon="mdi:counter" className="w-3 h-3 inline mr-1" />
                  {(chat.totalTokens || 0).toLocaleString("vi-VN")} tokens
                </div>
                <div className="mt-3">
                  {isOtherUser ? (
                    <Button variant="outline" size="sm" onClick={() => handleView(chat)}>
                      <Icon icon="mdi:eye-outline" className="w-4 h-4 mr-1" />
                      Xem chi tiết
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/dashboard?botId=${encodeURIComponent(chat.botId)}&chatId=${encodeURIComponent(chat.id)}`}
                      >
                        <Icon icon="mdi:eye-outline" className="w-4 h-4 mr-1" />
                        Mở cuộc trò chuyện
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{viewing.title}</h2>
                <p className="text-xs text-gray-500">
                  {botName(viewing)} · {viewing.messages.length} tin nhắn · {viewing.totalTokens} tokens
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
                <Icon icon="mdi:close" className="w-5 h-5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {viewing.messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "rounded-lg px-4 py-2 max-w-[80%] break-words " +
                      (m.role === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-900")
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-full">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-line">{m.content}</div>
                    )}
                    {m.tokens > 0 && <div className="text-[10px] opacity-60 mt-1">{m.tokens} tokens</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
