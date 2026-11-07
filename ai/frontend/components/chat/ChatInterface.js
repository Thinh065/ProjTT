"use client"

import { useRef, useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { apiFetch, getStoredUser } from "@/lib/api"

export default function ChatInterface({ bot, chat, onChatUpdate }) {
  const messages = chat?.messages || [];
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const textareaRef = useRef(null);

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
    if (!text || isTyping) return

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
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
        signal: controller.signal,
      })

      if (ok) {
        aiContent = data.message || "Không nhận được phản hồi từ AI."
        tokens = data.tokens || tokens
        sourceChunks = data.sourceChunks || []
      } else if (status === 429) {
        aiContent = "⚠️ Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau."
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
    onChatUpdate(
      {
        ...updatedChat,
        messages: finalMessages,
        lastMessage: aiContent,
        updatedAt: new Date().toISOString(),
        totalTokens: finalMessages.reduce((s, m) => s + (m.tokens || 0), 0),
      },
      { persist: true }
    )
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [input]);

  if (!bot) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="mdi:robot-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Chọn một ChatBot</h2>
          <p className="text-gray-500">Chọn một ChatBot AI để bắt đầu cuộc trò chuyện</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0 w-full">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", bot.color || "bg-gray-700")}>
              <Icon icon={bot.icon || "mdi:robot"} className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-500">Gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id || `${msg.role}-${idx}`}
              className={cn("flex space-x-3 chat-message min-w-0", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", bot.color || "bg-gray-700")}>
                  <Icon icon={bot.icon || "mdi:robot"} className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-lg px-4 py-2 max-w-[70%] min-w-0 break-words",
                  msg.role === "assistant"
                    ? "bg-gray-100 text-gray-900 self-start"
                    : "bg-primary text-white self-end"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm break-words max-w-full">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({node, ...props}) => (
                          <pre
                            className="overflow-x-auto bg-gray-200 rounded p-3 my-2 text-sm"
                            style={{ maxWidth: "100%" }}
                            {...props}
                          />
                        ),
                        code: ({node, ...props}) => (
                          <code
                            className="bg-gray-300 rounded px-1"
                            style={{ fontSize: "95%" }}
                            {...props}
                          />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 text-xs">Nguồn thông tin</summary>
                        <ul className="list-disc ml-4 text-xs text-gray-500">
                          {msg.sourceChunks.map((chunk, idx) => (
                            <li key={idx}>{chunk}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-line break-words">
                    {msg.content}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={avatar || "/placeholder-user.jpg"} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex space-x-3 min-w-0">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", bot.color || "bg-gray-700")}>
              <Icon icon={bot.icon || "mdi:robot"} className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
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
      <div className="bg-white border-t border-gray-200 p-4 min-w-0 w-full">
        <form className="flex gap-2 items-end px-2 py-2 md:px-4 md:py-4" onSubmit={handleSend}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-md border px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
            rows={1}
            style={{ minHeight: 40, maxHeight: 200, overflow: "auto" }}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="disabled:opacity-50 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition w-16 md:w-auto"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  )
}
