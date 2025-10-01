"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useRouter } from "next/navigation"

export default function ChatInterface({ bot, chat, onChatUpdate }) {
  const API_BACKEND = process.env.NEXT_PUBLIC_API_BACKEND
  const messages = chat?.messages || [];
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const textareaRef = useRef(null);

  const [ConfirmDialog, showConfirm] = useConfirmDialog()
  const router = useRouter()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.status === "blocked") {
      showConfirm({
        message: "Tài khoản đã tạm thời bị chặn!",
        onlyClose: true,
        onConfirm: () => {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          window.location.href = "/auth/login"
        }
      })
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  
    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setInput("")
    setIsTyping(true)

    // Update chat
    const updatedChat = {
      ...chat,
      id: chat?.id || Date.now(), // Đảm bảo luôn có id
      bot: { ...bot },
      messages: newMessages,
      title: chat?.title || input.trim().substring(0, 50) + "...",
      lastMessage: input.trim(),
      updatedAt: new Date().toISOString(),
    }
    onChatUpdate(updatedChat)

    // Gọi API thật tới backend
    try {
      const endpoint = bot._id === "esh-bot"
        ? `${API_BACKEND}/api/chatbot/gemini`
        : `${API_BACKEND}/api/chatbot/dynamic`;

      const res = await fetch(endpoint, {
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
        signal: controller.signal,
      })

      let aiContent = ""
      if (res.status === 429) {
        aiContent = "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau."
      } else {
        const data = await res.json()
        console.log("AI response:", data)
        aiContent =
          data?.choices?.[0]?.message?.content ||
          data?.message?.content ||
          data?.message ||
          data?.error?.message ||
          "Không nhận được phản hồi từ AI."

        const aiMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: aiContent,
          timestamp: new Date(),
          sourceChunks: data?.sourceChunks || [],
        }

        const finalMessages = [...newMessages, aiMessage]
        setIsTyping(false)

        // Lấy số token từ response
        const totalTokens = data?.usage?.total_tokens || 0;

        // Update chat with AI response
        const finalChat = {
          ...updatedChat,
          bot: { ...bot },
          messages: finalMessages,
          lastMessage: aiMessage.content,
          updatedAt: new Date().toISOString(),
          totalTokens, // Thêm dòng này
        }
        onChatUpdate(finalChat)

        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user._id || user.id;
        const botKey = bot._id || bot.id || "default";
        const historyKey = `chatHistory_${userId}_${botKey}`;
        let chatHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
        const chatData = {
          id: updatedChat.id,
          bot: { ...bot },
          title: updatedChat.title,
          messages: finalMessages,
          createdAt: updatedChat.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: finalMessages.length,
          preview: finalMessages[0]?.content || "",
          totalTokens, // Thêm dòng này
        };
        chatHistory = chatHistory.filter((c) => c.id !== updatedChat.id).concat(chatData);
        localStorage.setItem(historyKey, JSON.stringify(chatHistory));

        // Đồng bộ vào "Tất cả" của user
        const allHistoryKey = `chatHistory_${userId}_all`;
        let allHistory = JSON.parse(localStorage.getItem(allHistoryKey) || "[]");
        allHistory = allHistory.filter((c) => c.id !== updatedChat.id).concat(chatData);
        localStorage.setItem(allHistoryKey, JSON.stringify(allHistory));
      }
    } catch (error) {
      console.error("API call error:", error);
      if (error.name === "AbortError") {
        // Bị abort thì không làm gì cả
      }
      // Có thể thêm xử lý lỗi khác ở đây
    }
    setIsTyping(false);
  }

  const handleSendMessage = async (input) => {
    try {
      // Validate bot configuration first
      if (!bot.model || !bot.apiKey || !bot.baseURL) {
        throw new Error("Bot configuration is incomplete");
      }

      const newMessages = [...messages, {
        id: Date.now(),
        role: "user",
        content: input,
        timestamp: new Date(),
      }];

      // Update UI immediately with user message
      const updatedChat = {
        id: chat?.id || Date.now(),
        bot: { ...bot },
        messages: newMessages,
        title: chat?.title || input.trim().substring(0, 50) + "...",
        lastMessage: input.trim(),
        updatedAt: new Date().toISOString(),
      };
      onChatUpdate(updatedChat);

      // Prepare API request
      const endpoint = bot._id === "esh-bot"
        ? `${API_BACKEND}/api/chatbot/gemini`
        : `${API_BACKEND}/api/chatbot/dynamic`;

      const payload = {
        model: bot.model,
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        apiKey: bot.apiKey,
        baseURL: bot.baseURL,
      };

      // Log request for debugging
      console.log("Sending request to:", endpoint);
      console.log("Request payload:", payload);

      const res = await fetch(endpoint, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Handle response
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get AI response");
      }

      // Process response
      // ... rest of your code
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Show error to user
      setIsTyping(false);
      // Update chat with error message
      const errorMessage = {
        id: Date.now(),
        role: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra: " + error.message,
        timestamp: new Date()
      };
      const finalChat = {
        ...updatedChat,
        messages: [...newMessages, errorMessage],
        lastMessage: errorMessage.content,
        updatedAt: new Date().toISOString(),
      };
      onChatUpdate(finalChat);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Auto resize khi nhập
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  // Reset chiều cao khi input rỗng (sau khi gửi)
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
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", bot.color)}>
              <Icon icon={bot.icon} className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-500">Gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex space-x-3 chat-message min-w-0", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", bot.color)}>
                  <Icon icon={bot.icon} className="w-4 h-4 text-white" />
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
                    {/* Hiển thị sourceChunks nếu có */}
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
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex space-x-3 min-w-0">
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
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition w-16 md:w-auto"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  )
}
