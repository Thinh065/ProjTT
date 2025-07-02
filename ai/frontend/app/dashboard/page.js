"use client"

import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import BotSelector from "@/components/chat/BotSelector"
import ChatHistory from "@/components/chat/ChatHistory"
import ChatInterface from "@/components/chat/ChatInterface"

export default function DashboardPage() {
  const [bots, setBots] = useState([])
  const [selectedBot, setSelectedBot] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(true) // <-- Thêm state loading
  const [ConfirmDialog, showConfirm] = useConfirmDialog()
  const router = useRouter()

  const [editingTitle, setEditingTitle] = useState("");
  const [editingChat, setEditingChat] = useState(null);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlBotId = searchParams?.get("botId");
  const urlChatId = searchParams?.get("chatId");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.status === "blocked") {
      showConfirm({
        message: "Tài khoản đã tạm thời bị chặn!",
        onlyClose: true,
        onConfirm: () => {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/auth/login")
        }
      })
    }
  }, [])

  // Lấy danh sách ChatBot từ backend
  useEffect(() => {
    setLoading(true)
    fetch("http://localhost:5000/api/apikeys")
      .then((res) => res.json())
      .then((data) => {
        const visibleBots = data.filter(b => !b.hidden)
        setBots(visibleBots)
        let bot = null;
        if (urlBotId) {
          bot = visibleBots.find(b => b._id === urlBotId || b.id === urlBotId);
        } else {
          const botId = localStorage.getItem("currentBotId");
          if (botId) {
            bot = visibleBots.find(b => b._id === botId || b.id === botId);
          }
        }
        if (visibleBots.length === 0) {
          setSelectedBot(null); // <-- Không còn bot nào, set null
        } else if (bot) {
          setSelectedBot(bot);
        } else {
          setSelectedBot(visibleBots[0]);
        }
        setLoading(false)
      })
  }, [urlBotId]);

  // Khi đổi bot, đọc lịch sử chat từ localStorage
  useEffect(() => {
    if (!selectedBot) {
      setChatHistory([])
      setCurrentChat(null)
      return
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${userId}_${botKey}`
    let history = JSON.parse(localStorage.getItem(historyKey) || "[]")

    // Ưu tiên lấy chatId từ URL nếu có
    let chat = null;
    if (urlChatId) {
      chat = history.find(c => String(c.id) === String(urlChatId));
    } else {
      // Ưu tiên lấy chat từ localStorage nếu có
      const chatData = localStorage.getItem("currentChat")
      if (chatData) {
        try {
          const parsed = JSON.parse(chatData)
          chat = history.find(c => String(c.id) === String(parsed.id))
          setChatHistory(history)
          setCurrentChat(chat || history[0] || null)
          return
        } catch {}
      }
    }
    setChatHistory(history)
    setCurrentChat(chat || history[0] || null)
    setLoading(false) // <-- Đảm bảo setLoading(false) khi xong
  }, [selectedBot, urlChatId])

  // Lấy lại chat mới nhất từ localStorage khi vào Dashboard
  useEffect(() => {
    const chatData = localStorage.getItem("currentChat");
    if (chatData) {
      try {
        const chat = JSON.parse(chatData);
        setCurrentChat(chat);
        setSelectedBot(chat.bot);
      } catch {}
    }
  }, [])

  // Khi tạo chat mới
  const handleNewChat = () => {
    if (!selectedBot) return
    const newChat = {
      id: Date.now(),
      title: "Cuộc trò chuyện mới",
      bot: selectedBot,
      messages: [],
      createdAt: new Date(),
    }
    setCurrentChat(newChat)
    setChatHistory([newChat, ...chatHistory])
    // Lưu vào localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${userId}_${botKey}`
    localStorage.setItem(historyKey, JSON.stringify([newChat, ...chatHistory]))
  }

  // Khi cập nhật chat (gửi tin nhắn mới)
  const handleChatUpdate = (updatedChat) => {
    setCurrentChat(updatedChat)
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name
    const historyKey = `chatHistory_${userId}_${botKey}`
    const newHistory = [updatedChat, ...chatHistory.filter(c => c.id !== updatedChat.id)]
    setChatHistory(newHistory)
    localStorage.setItem(historyKey, JSON.stringify(newHistory))
  }

  const handleDeleteChat = (chatId) => {
    showConfirm({
      message: "Bạn có chắc muốn xóa cuộc trò chuyện này?",
      onConfirm: () => {
        const newHistory = chatHistory.filter((chat) => chat.id !== chatId)
        setChatHistory(newHistory)
        // Xóa trong localStorage
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user._id || user.id;
        const botKey = selectedBot._id || selectedBot.id || selectedBot.name
        const historyKey = `chatHistory_${userId}_${botKey}`
        localStorage.setItem(historyKey, JSON.stringify(newHistory))
        // Xóa ở "all"
        const allHistoryKey = `chatHistory_${userId}_all`
        let allHistory = JSON.parse(localStorage.getItem(allHistoryKey) || "[]")
        allHistory = allHistory.filter((chat) => chat.id !== chatId)
        localStorage.setItem(allHistoryKey, JSON.stringify(allHistory))
        // Nếu chat hiện tại bị xóa thì bỏ chọn
        if (currentChat && currentChat.id === chatId) {
          setCurrentChat(newHistory[0] || null)
        }
      }
    })
  }

  const handleSelectBot = (bot) => {
    setSelectedBot(bot)
    localStorage.setItem("currentBotId", bot._id || bot.id)
  }

  const handleSelectChat = (chat) => {
    setCurrentChat(chat)
    localStorage.setItem("currentChat", JSON.stringify(chat))
  }

  const handleEditTitle = () => {
    setEditingTitle(currentChat?.title || "");
    setEditingChat(currentChat?.id);
  };

  const handleSaveTitle = () => {
    if (!currentChat) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;
    // Cập nhật trong localStorage
    const allHistoryKey = `chatHistory_${userId}_all`;
    let allHistory = JSON.parse(localStorage.getItem(allHistoryKey) || "[]");
    allHistory = allHistory.map(c => c.id === currentChat.id ? { ...c, title: editingTitle } : c);
    localStorage.setItem(allHistoryKey, JSON.stringify(allHistory));
    setCurrentChat({ ...currentChat, title: editingTitle });
    setEditingChat(null);
    setEditingTitle("");
    // Nếu có bot cụ thể, cập nhật luôn
    if (currentChat.bot && currentChat.bot._id) {
      const botHistoryKey = `chatHistory_${userId}_${currentChat.bot._id}`;
      let botHistory = JSON.parse(localStorage.getItem(botHistoryKey) || "[]");
      botHistory = botHistory.map(c => c.id === currentChat.id ? { ...c, title: editingTitle } : c);
      localStorage.setItem(botHistoryKey, JSON.stringify(botHistory));
    }
  };

  // Đọc lịch sử chat từ localStorage khi đổi bot
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;
    if (!userId || !selectedBot) return;
    const botKey = selectedBot._id || selectedBot.id || selectedBot.name;
    const historyKey = `chatHistory_${userId}_${botKey}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    setChatHistory(history);
    setCurrentChat(history[0] || null);
  }, [selectedBot, typeof window !== "undefined" && localStorage.getItem("user")]);

  // Kiểm tra trạng thái tài khoản mỗi 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!token || !user._id) return;
      try {
        const res = await fetch(`http://localhost:5000/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const users = await res.json();
        const me = users.find(u => u._id === user._id);
        if (me && me.status === "blocked") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/auth/login";
          alert("Tài khoản của bạn đã bị chặn!");
        }
      } catch {}
    }, 30000); // 30 giây

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Bot Selector */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <BotSelector
          bots={bots}
          selectedBot={selectedBot}
          onSelectBot={handleSelectBot}
        />
        <ChatHistory
          selectedBot={selectedBot}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
          chats={chatHistory}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header ChatBot */}
        {selectedBot && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedBot.color}`}>
                {/* Nếu có icon */}
                {selectedBot.icon && (
                  <span className="text-white text-xl">
                    <i className={selectedBot.icon}></i>
                  </span>
                )}
              </div>
              <span className="font-semibold text-lg">{selectedBot.name}</span>
              {currentChat && (
                <div className="flex items-center gap-2 ml-4">
                  {editingChat === currentChat.id ? (
                    <>
                      <input
                        className="border px-2 py-1 rounded text-sm"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveTitle();
                          if (e.key === "Escape") setEditingChat(null);
                        }}
                        autoFocus
                      />
                      <button
                        className="text-green-600 px-1"
                        onClick={handleSaveTitle}
                        title="Lưu"
                      >✔</button>
                      <button
                        className="text-gray-500 px-1"
                        onClick={() => setEditingChat(null)}
                        title="Hủy"
                      >✖</button>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-medium">{currentChat.title}</span>
                      <button
                        className="text-blue-600 px-1"
                        onClick={handleEditTitle}
                        title="Đổi tên"
                      >✎</button>
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
              onClick={handleNewChat}
            >
              + Tạo chat mới
            </button>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          {selectedBot ? (
            <ChatInterface bot={selectedBot} chat={currentChat} onChatUpdate={handleChatUpdate} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Chưa có ChatBot nào</h2>
                <p className="text-gray-500">Hãy thêm ChatBot AI trong trang quản trị để bắt đầu sử dụng</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  )
}
