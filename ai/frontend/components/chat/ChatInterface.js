"use client"

import { useRef, useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { apiFetch, getStoredUser } from "@/lib/api"
import { messageText } from "@/lib/chat"

export default function ChatInterface({ bot, chat, onChatUpdate }) {
  const messages = chat?.messages || []
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  // Đang lưu lịch sử: chặn gửi tiếp để chat mới không bị tạo trùng trên server
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const textareaRef = useRef(null)

  const [avatar, setAvatar] = useState("")
  useEffect(() => {
    setAvatar(getStoredUser().avatar || "")
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Huỷ request đang chạy khi rời trang / đổi chat
  useEffect(() => () => abortControllerRef.current?.abort(), [])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isTyping || isSaving) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setInput("")
    setIsTyping(true)

    const updatedChat = {
      ...chat,
      botId: bot._id,
      botName: bot.name,
      messages: newMessages,
      title:
        chat?.title && chat.title !== "Cuộc trò chuyện mới"
          ? chat.title
          : text.length > 50
            ? text.substring(0, 50) + "..."
            : text,
      lastMessage: text,
      updatedAt: new Date().toISOString(),
    }
    // Hiện tin nhắn của user ngay, chưa lưu
    onChatUpdate(updatedChat, { persist: false })

    let aiContent = ""
    let tokens = { input: 0, output: 0, total: 0 }
    let sourceChunks = []
    try {
      const { ok, status, data } = await apiFetch("/api/chatbot/dynamic", {
        method: "POST",
        body: {
          botId: bot._id,
          messages: newMessages.map((m) => ({ role: m.role, content: messageText(m) })),
        },
        signal: controller.signal,
      })

      if (ok) {
        aiContent = data.message || "Không nhận được phản hồi từ AI."
        tokens = data.tokens || tokens
        sourceChunks = data.sourceChunks || []
      } else if (status === 429) {
        aiContent = `⚠️ ${data?.message || "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau."}`
      } else {
        aiContent = `⚠️ ${data?.message || "Không nhận được phản hồi từ AI."}`
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setIsTyping(false)
        return
      }
      aiContent = "⚠️ Có lỗi khi gọi AI, vui lòng thử lại."
    }

    // Gắn số token: input cho tin của user, output cho tin của AI
    const finalUser = { ...userMessage, tokens: tokens.input || 0 }
    const aiMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: aiContent,
      timestamp: new Date().toISOString(),
      tokens: tokens.output || Math.max(0, (tokens.total || 0) - (tokens.input || 0)),
      ...(sourceChunks.length ? { sourceChunks } : {}),
    }
    const finalMessages = [...messages, finalUser, aiMessage]

    setIsTyping(false)
    setIsSaving(true)
    try {
      await onChatUpdate(
        {
          ...updatedChat,
          messages: finalMessages,
          lastMessage: aiContent,
          updatedAt: new Date().toISOString(),
          totalTokens: finalMessages.reduce((s, m) => s + (m.tokens || 0), 0),
        },
        { persist: true }
      )
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "40px"
      textarea.style.height = textarea.scrollHeight + "px"
    }
  }

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "40px"
    }
  }, [input])

  if (!bot) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fbfaff]">
        <div className="text-center">
          <Icon icon="mdi:robot-outline" className="w-16 h-16 text-[#7c3aed]/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1d1530] mb-2">Chọn một ChatBot</h2>
          <p className="text-[#5d566f]">Chọn một ChatBot AI để bắt đầu cuộc trò chuyện</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col min-w-0 bg-transparent">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-w-0 w-full custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-[18px] flex items-center justify-center mx-auto mb-4 bg-[#f1edff] border border-[rgba(124,58,237,0.22)] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
              <Icon icon={bot.icon || "mdi:robot"} className="w-8 h-8 text-[#7c3aed]" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1530] mb-1">{bot.name}</h3>
            <p className="text-xs text-[#5d566f] leading-relaxed">
              {bot.description || "Gửi tin nhắn bên dưới để bắt đầu cuộc trò chuyện với mô hình AI."}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id || `${msg.role}-${idx}`}
              className={cn(
                "flex space-x-2.5 sm:space-x-3 chat-message min-w-0",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-[12px] flex items-center justify-center flex-shrink-0 bg-[#f1edff] border border-[rgba(124,58,237,0.22)] shadow-xs">
                  <Icon icon={bot.icon || "mdi:robot"} className="w-4 h-4 text-[#7c3aed]" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-[18px] px-4 py-3 max-w-[82%] sm:max-w-[78%] min-w-0 break-words text-sm leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] text-[#1d1530] self-start shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]"
                    : "bg-[#7c3aed] text-white self-end shadow-[0_12px_28px_-14px_rgba(124,58,237,0.5)]"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm break-words max-w-full text-[#1d1530]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ node, ...props }) => (
                          <pre
                            className="overflow-x-auto bg-[#1d1530] text-[#f1edff] rounded-[12px] p-3 my-2 text-xs font-mono border border-[rgba(76,29,149,0.2)]"
                            style={{ maxWidth: "100%" }}
                            {...props}
                          />
                        ),
                        code: ({ node, ...props }) => (
                          <code
                            className="bg-[#f1edff] text-[#4c1d95] rounded px-1.5 py-0.5 font-mono text-[90%] border border-[rgba(76,29,149,0.12)]"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {messageText(msg)}
                    </ReactMarkdown>
                    {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                      <details className="mt-2.5 pt-2 border-t border-[rgba(76,29,149,0.12)]">
                        <summary className="cursor-pointer text-[#7c3aed] hover:text-[#6d28d9] text-xs font-medium">
                          Nguồn thông tin
                        </summary>
                        <ul className="list-disc ml-4 text-xs text-[#5d566f] mt-1 space-y-0.5">
                          {msg.sourceChunks.map((chunk, idx) => (
                            <li key={idx}>{chunk}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-line break-words text-white">
                    {msg.content}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-[#7c3aed]/25 shadow-xs">
                  <AvatarImage src={avatar || "/placeholder-user.jpg"} />
                  <AvatarFallback className="bg-[#f1edff] text-[#5b21b6] text-xs font-bold">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-[12px] flex items-center justify-center flex-shrink-0 bg-[#f1edff] border border-[rgba(124,58,237,0.22)] shadow-xs">
              <Icon icon={bot.icon || "mdi:robot"} className="w-4 h-4 text-[#7c3aed]" />
            </div>
            <div className="bg-[rgba(255,255,255,0.82)] border border-[rgba(76,29,149,0.12)] px-4 py-2.5 rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border-t border-[rgba(76,29,149,0.12)] p-3 md:p-4 min-w-0 w-full">
        <form className="flex gap-2.5 items-end max-w-4xl mx-auto" onSubmit={handleSend}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
            placeholder="Nhập câu hỏi hoặc yêu cầu cho AI..."
            className="flex-1 rounded-[12px] border border-[rgba(76,29,149,0.12)] px-4 py-2.5 text-sm text-[#1d1530] placeholder:text-[#5d566f]/70 resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition w-full bg-white/90 hover:bg-white shadow-xs"
            rows={1}
            style={{ minHeight: 44, maxHeight: 200, overflow: "auto" }}
          />
          <button
            type="submit"
            disabled={isTyping || isSaving || !input.trim()}
            className="disabled:opacity-40 bg-[#7c3aed] text-white px-4 py-2.5 rounded-[12px] hover:bg-[#6d28d9] transition font-medium flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] h-[44px] flex-shrink-0"
          >
            <Icon icon="mdi:send" className="w-4 h-4 text-white" />
            <span className="hidden sm:inline text-xs">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  )
}
