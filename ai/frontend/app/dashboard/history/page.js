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
import { messageText } from "@/lib/chat"

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

  if (loading) return <div className="p-6 text-[#5d566f] text-sm font-medium">Đang tải lịch sử...</div>

  const botsInHistory = bots.filter((b) => chats.some((c) => c.botId === b._id))

  return (
    <div className="container mx-auto p-4 sm:p-6 text-[#1d1530]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1d1530]">
            {isOtherUser ? `Lịch sử của ${target.name || "người dùng"}` : "Lịch sử trò chuyện"}
          </h1>
          <p className="text-sm text-[#5d566f] mt-1">
            {chats.length} cuộc trò chuyện · Tổng {totalTokens.toLocaleString("vi-VN")} tokens
            {isOtherUser && (
              <>
                {" · "}
                <Link href="/dashboard/admin" className="text-[#7c3aed] hover:text-[#6d28d9] font-medium hover:underline">
                  Quay lại trang quản trị
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#5d566f] w-4 h-4"
          />
          <Input
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-[12px] bg-[rgba(255,255,255,0.82)] border-[rgba(76,29,149,0.12)] text-[#1d1530] placeholder:text-[#5d566f]/70 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed] shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-[rgba(225,29,72,0.25)] bg-[#fff1f2] p-3 text-[#be123c] text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={selectedBot === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedBot("all")}
          className={
            selectedBot === "all"
              ? "rounded-[11px] bg-[#7c3aed] text-white hover:bg-[#6d28d9] border border-[#7c3aed] shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)]"
              : "rounded-[11px] bg-[rgba(255,255,255,0.82)] text-[#1d1530] border border-[rgba(76,29,149,0.12)] hover:bg-[#f1edff] hover:text-[#5b21b6] hover:border-[#7c3aed]/30"
          }
        >
          Tất cả
        </Button>
        {botsInHistory.map((bot) => (
          <Button
            key={bot._id}
            variant={selectedBot === bot._id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBot(bot._id)}
            className={
              selectedBot === bot._id
                ? "rounded-[11px] bg-[#7c3aed] text-white hover:bg-[#6d28d9] border border-[#7c3aed] shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)]"
                : "rounded-[11px] bg-[rgba(255,255,255,0.82)] text-[#1d1530] border border-[rgba(76,29,149,0.12)] hover:bg-[#f1edff] hover:text-[#5b21b6] hover:border-[#7c3aed]/30"
            }
          >
            {bot.name}
          </Button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
          <Icon icon="mdi:chat-outline" className="w-16 h-16 text-[#7c3aed]/35 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1d1530] mb-2">
            {searchTerm || selectedBot !== "all" ? "Không tìm thấy cuộc trò chuyện" : "Chưa có lịch sử trò chuyện"}
          </h2>
          <p className="text-[#5d566f] text-sm">
            {searchTerm || selectedBot !== "all"
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
              : "Bắt đầu trò chuyện với ChatBot AI để xem lịch sử ở đây"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((chat) => (
            <Card
              key={chat.id}
              className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] hover:border-[#7c3aed]/35 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    {editingChatId === chat.id ? (
                      <input
                        className="border border-[rgba(124,58,237,0.34)] bg-white text-[#1d1530] px-2.5 py-1 rounded-[10px] text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
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
                        <CardTitle className="text-sm font-semibold text-[#1d1530] truncate">{chat.title}</CardTitle>
                        <Badge
                          variant="secondary"
                          className="text-xs mt-1.5 bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#f1edff] font-medium"
                        >
                          {botName(chat)}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {editingChatId === chat.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-[10px] hover:bg-[#f1edff]"
                          onClick={() => handleSaveEdit(chat)}
                        >
                          <Icon icon="mdi:check" className="w-4 h-4 text-[#7c3aed]" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-[10px] hover:bg-[#fff1f2]"
                          onClick={() => setEditingChatId(null)}
                        >
                          <Icon icon="mdi:close" className="w-4 h-4 text-[#5d566f]" />
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
                          className="h-8 w-8 p-0 rounded-[10px] text-[#5d566f] hover:text-[#7c3aed] hover:bg-[#f1edff]"
                          title="Đổi tên"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportChat(chat)}
                          className="h-8 w-8 p-0 rounded-[10px] text-[#5d566f] hover:text-[#7c3aed] hover:bg-[#f1edff]"
                          title="Tải về JSON"
                        >
                          <Icon icon="mdi:download" className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteChat(chat.id)}
                          className="h-8 w-8 p-0 rounded-[10px] text-[#be123c] hover:text-[#be123c] hover:bg-[#fff1f2]"
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
                <CardDescription className="text-sm text-[#5d566f] mb-3 line-clamp-2">
                  {chat.lastMessage}
                </CardDescription>
                <div className="flex items-center justify-between text-xs text-[#5d566f]">
                  <span>{chat.messageCount} tin nhắn</span>
                  <span>{formatDate(chat.updatedAt)}</span>
                </div>
                <div className="inline-flex items-center text-xs text-[#5b21b6] bg-[#f1edff] px-2 py-0.5 rounded-full border border-[rgba(124,58,237,0.18)] mt-2 font-mono">
                  <Icon icon="mdi:counter" className="w-3 h-3 inline mr-1" />
                  {(chat.totalTokens || 0).toLocaleString("vi-VN")} tokens
                </div>
                <div className="mt-3.5">
                  {isOtherUser ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(chat)}
                      className="rounded-[11px] bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#7c3aed] hover:text-white hover:border-[#7c3aed] transition font-medium"
                    >
                      <Icon icon="mdi:eye-outline" className="w-4 h-4 mr-1.5" />
                      Xem chi tiết
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-[11px] bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#7c3aed] hover:text-white hover:border-[#7c3aed] transition font-medium"
                    >
                      <Link
                        href={`/dashboard?botId=${encodeURIComponent(chat.botId)}&chatId=${encodeURIComponent(chat.id)}`}
                      >
                        <Icon icon="mdi:eye-outline" className="w-4 h-4 mr-1.5" />
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#1d1530]/40 backdrop-blur-xs p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-[#fbfaff] border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(76,29,149,0.12)] bg-[rgba(255,255,255,0.82)] px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="font-semibold text-[#1d1530] truncate">{viewing.title}</h2>
                <p className="text-xs text-[#5d566f]">
                  {botName(viewing)} · {viewing.messages.length} tin nhắn · {viewing.totalTokens} tokens
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#5d566f] hover:text-[#1d1530] hover:bg-[#f1edff] rounded-[10px]"
                onClick={() => setViewing(null)}
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {viewing.messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "rounded-[16px] px-4 py-2.5 max-w-[82%] break-words text-sm " +
                      (m.role === "user"
                        ? "bg-[#7c3aed] text-white shadow-[0_12px_28px_-14px_rgba(124,58,237,0.5)]"
                        : "bg-[rgba(255,255,255,0.82)] border border-[rgba(76,29,149,0.12)] text-[#1d1530] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]")
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-full text-[#1d1530]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText(m)}</ReactMarkdown>
                        {m.sourceChunks?.length > 0 && (
                          <details className="mt-2 pt-2 border-t border-[rgba(76,29,149,0.12)]">
                            <summary className="cursor-pointer text-[#7c3aed] hover:text-[#6d28d9] text-xs font-medium">
                              Nguồn thông tin
                            </summary>
                            <ul className="list-disc ml-4 text-xs text-[#5d566f] mt-1 space-y-0.5">
                              {m.sourceChunks.map((chunk, idx) => (
                                <li key={idx}>{chunk}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-line">{m.content}</div>
                    )}
                    {m.tokens > 0 && <div className="text-[10px] opacity-70 mt-1 font-mono">{m.tokens} tokens</div>}
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
