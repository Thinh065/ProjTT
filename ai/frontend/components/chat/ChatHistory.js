"use client"
import { useRouter } from "next/navigation"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"

import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function ChatHistory({ selectedBot, currentChat, onSelectChat, redirectToDashboard, chats = [], onDeleteChat }) {
  const router = useRouter()
  const [ConfirmDialog, showCustomConfirm] = useConfirmDialog()

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)

    if (diffDays <= 0) return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Hôm qua"
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString("vi-VN")
  }

  const handleDelete = (chatId, e) => {
    e.stopPropagation()
    showCustomConfirm({
      message: "Bạn có chắc muốn xóa cuộc trò chuyện này?",
      onConfirm: () => {
        onDeleteChat(chatId)
      }
    })
  }

  const handleSelectChat = (chat) => {
    if (redirectToDashboard) {
      const botId = chat.botId;
      if (!botId) {
        alert("Bot không hợp lệ!");
        return;
      }
      router.push(`/dashboard?botId=${botId}&chatId=${chat.id}`);
    } else if (onSelectChat) {
      onSelectChat(chat);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5d566f]">
            Lịch sử trò chuyện
          </h3>
          {selectedBot && (
            <span className="text-[11px] text-[#5b21b6] truncate max-w-[120px] font-medium">
              {selectedBot.name}
            </span>
          )}
        </div>

        {(Array.isArray(chats) && chats.length === 0) ? (
          <div className="text-center py-8">
            <Icon icon="mdi:chat-outline" className="w-10 h-10 text-[#7c3aed]/30 mx-auto mb-2" />
            <p className="text-xs text-[#5d566f]">Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(Array.isArray(chats) ? chats : []).map((chat, idx) => {
              const isActive = currentChat?.id && currentChat.id === chat.id
              return (
                <div
                  key={chat.id || chat._id || idx}
                  className={cn(
                    "p-2.5 rounded-[16px] border cursor-pointer transition-all duration-150 group relative",
                    isActive
                      ? "bg-[#f1edff] border-[#7c3aed]/40 shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] ring-1 ring-[#7c3aed]/20"
                      : "bg-[rgba(255,255,255,0.82)] border-[rgba(76,29,149,0.12)] hover:border-[#7c3aed]/30 hover:bg-[#f1edff]/45 shadow-[0_12px_32px_-18px_rgba(76,29,149,0.18)]"
                  )}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          "text-xs font-semibold truncate",
                          isActive ? "text-[#5b21b6]" : "text-[#1d1530]"
                        )}
                      >
                        {chat.title}
                      </h4>
                      <p className="text-[11px] text-[#5d566f] truncate mt-0.5">
                        {chat.lastMessage || "Chưa có tin nhắn"}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#5d566f]/80">
                        <span>{formatDate(chat.updatedAt)}</span>
                        <span>{chat.messageCount || 0} tin</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 h-6 w-6 text-[#5d566f] hover:text-[#be123c] hover:bg-[#fff1f2] rounded-[8px]"
                      onClick={(e) => handleDelete(chat.id, e)}
                      title="Xóa đoạn chat"
                    >
                      <Icon icon="mdi:trash-can-outline" className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {ConfirmDialog}
      </div>
    </div>
  )
}
