"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function ChatInterface({ bot, chat, onChatUpdate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (chat?.messages) {
      setMessages(chat.messages)
    } else {
      setMessages([])
    }
  }, [chat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsTyping(true)

    // Update chat
    const updatedChat = {
      ...chat,
      messages: newMessages,
      title: chat?.title || input.trim().substring(0, 50) + "...",
      lastMessage: input.trim(),
      updatedAt: new Date().toISOString(),
    }
    onChatUpdate(updatedChat)

    // Gọi API thật tới backend
    try {
      const res = await fetch("http://localhost:5000/api/chatbot/dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: bot.model,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiKey: bot.apiKey,
          baseURL: bot.baseURL,
          referer: bot.referer,
          title: bot.title,
        }),
      })

      const data = await res.json()
      console.log("AI response:", data) // Thêm dòng này để kiểm tra dữ liệu trả về
      let aiContent =
        data?.choices?.[0]?.message?.content ||
        data?.message?.content ||
        data?.message ||
        "Không nhận được phản hồi từ AI."

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
      }

      const finalMessages = [...newMessages, aiMessage]
      setMessages(finalMessages)
      setIsTyping(false)

      // Update chat with AI response
      const finalChat = {
        ...updatedChat,
        messages: finalMessages,
        lastMessage: aiMessage.content,
        updatedAt: new Date().toISOString(),
      }
      onChatUpdate(finalChat)
    } catch (error) {
      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Đã xảy ra lỗi khi gọi AI: " + error.message,
        timestamp: new Date(),
      }
      setMessages([...newMessages, aiMessage])
      setIsTyping(false)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bot.color)}>
            <Icon icon={bot.icon} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{bot.name}</h2>
            <p className="text-sm text-gray-500">{bot.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", bot.color)}>
              <Icon icon={bot.icon} className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Bắt đầu trò chuyện với {bot.name}</h3>
            <p className="text-gray-500">Gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex space-x-3 chat-message", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" && (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", bot.color)}>
                  <Icon icon={bot.icon} className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                  message.role === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-900",
                )}
              >
                <p className="text-sm">{message.content}</p>
                <p className={cn("text-xs mt-1", message.role === "user" ? "text-blue-100" : "text-gray-500")}>
                  {formatTime(message.timestamp)}
                </p>
              </div>

              {message.role === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex space-x-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", bot.color)}>
              <Icon icon={bot.icon} className="w-4 h-4 text-white" />
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
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Nhắn tin cho ${bot.name}...`}
            disabled={isTyping}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isTyping}>
            <Icon icon="mdi:send" className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
