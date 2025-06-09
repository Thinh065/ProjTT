"use client"
import { useRouter } from "next/navigation"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function ChatHistory({ selectedBot, currentChat, onSelectChat, redirectToDashboard, chats = [], onDeleteChat }) {
  const router = useRouter()
  const [chatHistory, setChatHistory] = useState([])
  const [ConfirmDialog, showCustomConfirm] = useConfirmDialog()

  useEffect(() => {
    const historyKey = "chatHistory";
    const allHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
    if (selectedBot) {
      setChatHistory(allHistory.filter(
        (chat) =>
          (chat.bot?._id && chat.bot._id === selectedBot._id) ||
          (chat.bot?.id && chat.bot.id === selectedBot.id)
      ));
    } else {
      setChatHistory([]);
    }
  }, [selectedBot]);

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
      const botId = chat.bot?.id || chat.bot?._id;
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
                key={chat.id || chat._id || idx} // Luôn đảm bảo key duy nhất
                className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors group",
                  currentChat?.id === chat.id ? "bg-blue-50 border-blue-200" : "border-gray-200",
                )}
                onClick={() => handleSelectChat(chat)}
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

