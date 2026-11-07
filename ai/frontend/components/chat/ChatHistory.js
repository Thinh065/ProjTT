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
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Lịch sử trò chuyện
          {selectedBot && ` - ${selectedBot.name}`}
        </h3>

        {(Array.isArray(chats) && chats.length === 0) ? (
          <div className="text-center py-8">
            <Icon icon="mdi:chat-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(Array.isArray(chats) ? chats : []).map((chat, idx) => (
              <div
                key={chat.id || chat._id || idx}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors group",
                  currentChat?.id && currentChat.id === chat.id ? "bg-blue-50 border-blue-200" : "border-gray-200",
                )}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{chat.title}</h4>
                    <p className="text-xs text-gray-500 truncate mt-1">{chat.lastMessage}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{formatDate(chat.updatedAt)}</span>
                      <span className="text-xs text-gray-400">{chat.messageCount || 0} tin nhắn</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    onClick={(e) => handleDelete(chat.id, e)}
                  >
                    <Icon icon="mdi:delete" className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {ConfirmDialog}
      </div>
    </div>
  )
}
