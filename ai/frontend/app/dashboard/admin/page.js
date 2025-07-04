"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiKeys, setAiKeys] = useState([])
  const [aiForm, setAiForm] = useState({
    name: "",
    apiKey: "",
    baseURL: "",
    model: "",
    image: "",
    referer: "",
    title: ""
  })
  const [showAiForm, setShowAiForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const currentUserId = currentUser._id || currentUser.id
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const router = useRouter()
  const chatbotRef = useRef(null);
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  useEffect(() => {
    fetchUsers()
    fetchAiKeys()
  }, [])

  useEffect(() => {
    // Scroll xuống phần ChatBot khi vào trang
    if (chatbotRef.current) {
      chatbotRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch("http://localhost:5000/api/auth/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  const fetchAiKeys = async () => {
    const res = await fetch("http://localhost:5000/api/apikeys")
    const data = await res.json()
    setAiKeys(data)
  }

  // Đổi role user
  const handleChangeRole = async (userId, newRole) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
    const res = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      const updatedUser = await res.json()
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: updatedUser.role } : u))
      )
    } else {
      const data = await res.json()
      alert(data.message || "Lỗi khi đổi quyền")
    }
  }

  // Đổi trạng thái user
  const handleChangeStatus = async (userId, newStatus) => {
    if (userId === currentUserId) {
      showConfirm({ message: "Không thể thay đổi trạng thái của chính bạn!", onlyClose: true })
      return
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
    const res = await fetch(`http://localhost:5000/api/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: data.status } : u))
      )
      showConfirm({
        message: newStatus === "blocked" ? "Đã chặn người dùng!" : "Đã mở chặn người dùng!",
        onlyClose: true,
      })
    } else {
      showConfirm({ message: data.message || "Lỗi khi đổi trạng thái", onlyClose: true })
    }
  }

  // Xóa user
  const handleDeleteUser = async (userId) => {
    if (userId === currentUserId) {
      alert("Không thể xóa chính bạn!")
      return
    }
    showConfirm({
      message: "Bạn có chắc chắn muốn xóa user này?",
      onConfirm: async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
        const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (res.ok) {
          setUsers((prev) => prev.filter((u) => u._id !== userId))
        } else {
          const data = await res.json()
          alert(data.message || "Lỗi khi xóa user")
        }
      }
    })
  }

  const handleAiFormChange = (e) => {
    setAiForm({ ...aiForm, [e.target.name]: e.target.value })
  }

  const handleAddAiKey = async (e) => {
    e.preventDefault()
    showConfirm({
      message: "Bạn có chắc chắn muốn thêm ChatBot này?",
      onConfirm: async () => {
        const res = await fetch("http://localhost:5000/api/apikeys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiForm)
        })
        if (res.ok) {
          setShowAiForm(false)
          fetchAiKeys()
          showConfirm({
            message: "Thêm AI Key thành công!",
            onlyClose: true
          })
        } else {
          const data = await res.json()
          showConfirm({
            message: data.message || "Lỗi khi thêm AI Key",
            onlyClose: true
          })
        }
      }
    })
  }

  const handleAiImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const formData = new FormData()
      formData.append("image", file)
      const res = await fetch("http://localhost:5000/api/upload/avatar", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        setAiForm({ ...aiForm, image: data.url })
        // Sau khi upload avatar thành công, gọi lại fetchUsers()
        await fetchUsers()
      }
    }
  }

  const handleDeleteBot = async (botId) => {
    await fetch(`http://localhost:5000/api/apikeys/${botId}`, { method: "DELETE" });
    // Xóa lịch sử liên quan
    const historyKey = "chatHistory";
    let chatHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
    chatHistory = chatHistory.filter((chat) => chat.bot._id !== botId && chat.bot.id !== botId);
    localStorage.setItem(historyKey, JSON.stringify(chatHistory));
    // Xóa cả cuộc hội thoại đang dở nếu thuộc bot này
    const currentKey = "currentChat";
    let currentChat = JSON.parse(localStorage.getItem(currentKey) || "null");
    if (currentChat && (currentChat.bot?._id === botId || currentChat.bot?.id === botId)) {
      localStorage.removeItem(currentKey);
    }
    fetchAiKeys();
  };

  // Ẩn/hiện ChatBot
  const handleHideAiKey = async (botId, hidden) => {
    await fetch(`http://localhost:5000/api/apikeys/${botId}/hide`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    fetchAiKeys();
  };

  if (loading) return <div>Đang tải...</div>

  return (
    <div className="container mx-auto p-6 h-screen overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Quản trị hệ thống</h1>

      <div className="grid gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>Quản lý người dùng</CardTitle>
            <CardDescription>Quản lý tài khoản và phân quyền người dùng</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>
                        {user.status === "active" ? "Hoạt động" : "Bị chặn"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Nút chặn/mở chặn */}
                        <Button
                          size="sm"
                          variant={user.status === "blocked" ? "outline" : "destructive"}
                          onClick={() =>
                            showConfirm({
                              message: user.status === "blocked"
                                ? "Bạn có muốn mở chặn người dùng này?"
                                : "Bạn có muốn chặn người dùng này?",
                              onConfirm: () => handleChangeStatus(user._id, user.status === "blocked" ? "active" : "blocked"),
                            })
                          }
                        >
                          <Icon icon={user.status === "blocked" ? "mdi:lock-open-outline" : "mdi:lock-outline"} className="w-4 h-4" />
                        </Button>
                        {/* Nút nâng/hạ quyền */}
                        {user._id !== currentUserId && (
                          user.role === "admin" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeRole(user._id, "user")}
                            >
                              <Icon icon="mdi:arrow-down" className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeRole(user._id, "admin")}
                            >
                              <Icon icon="mdi:arrow-up" className="w-4 h-4" />
                            </Button>
                          )
                        )}
                        {/* Nút xóa */}
                        {user._id !== currentUserId && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            <Icon icon="mdi:delete" className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Key Management */}
        <Card className="mt-8" ref={chatbotRef}>
          <CardHeader>
            <CardTitle>Quản lý ChatBot</CardTitle>
            <CardDescription>Thêm và quản lý các ChatBot AI cho hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Button
                className="bg-blue-600 text-white"
                onClick={() => setShowAiForm((v) => !v)}
              >
                {showAiForm ? "Đóng" : "Thêm ChatBot"}
              </Button>
            </div>
            {showAiForm && (
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-6 bg-white rounded-xl shadow border border-gray-200"
                onSubmit={handleAddAiKey}
              >
                <input name="name" value={aiForm.name} onChange={handleAiFormChange} placeholder="Tên AI" required />
                <div className="relative flex items-center">
                  <input
                    name="apiKey"
                    value={aiForm.apiKey}
                    onChange={handleAiFormChange}
                    placeholder="API Key"
                    required
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    autoComplete="off"
                  />
                </div>
                <input name="baseURL" value={aiForm.baseURL} onChange={handleAiFormChange} placeholder="Base URL" required />
                <input name="model" value={aiForm.model} onChange={handleAiFormChange} placeholder="Model" required />
                <Button
                  type="button"
                  className="col-span-1 md:col-span-2"
                  variant="outline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Ẩn trường nâng cao" : "Hiện trường nâng cao"}
                </Button>
                {showAdvanced && (
                  <>
                    <input name="image" value={aiForm.image} onChange={handleAiFormChange} placeholder="Ảnh đại diện (URL)" />
                    <input name="referer" value={aiForm.referer} onChange={handleAiFormChange} placeholder="HTTP-Referer (optional)" />
                    <input name="title" value={aiForm.title} onChange={handleAiFormChange} placeholder="X-Title (optional)" />
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAiImageChange}
                  className="col-span-1 md:col-span-2"
                />
                {aiForm.image && (
                  <img src={aiForm.image} alt="avatar" className="w-12 h-12 rounded-full mt-2" />
                )}
                <button type="submit" className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded">Lưu ChatBot</button>
              </form>
            )}

            <div>
              <h3 className="font-semibold mb-2">Danh sách ChatBot</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ChatBot</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Base URL</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiKeys.map((ai) => (
                    <TableRow key={ai._id}>
                      <TableCell className="flex items-center space-x-3">
                        {ai.image && (
                          <img src={ai.image} alt={ai.name} className="w-8 h-8 rounded-full" />
                        )}
                        <span className="font-medium">{ai.name}</span>
                      </TableCell>
                      <TableCell>{ai.model}</TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{ai.baseURL}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ai.hidden ? "destructive" : "default"}>
                          {ai.hidden ? "Tạm ẩn" : "Hiện"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ai.createdAt
                          ? new Date(ai.createdAt).toLocaleString()
                          : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Nút Ẩn/Hiện */}
                          <button
                            className={`px-2 py-1 rounded text-xs ${ai.hidden ? "bg-green-500 text-white" : "bg-gray-300 text-black"}`}

                            onClick={() => handleHideAiKey(ai._id, !ai.hidden)}
                            title={ai.hidden ? "Hiện bot" : "Ẩn bot"}
                          >
                            {ai.hidden ? "Hiện" : "Ẩn"}
                          </button>
                          {/* Nút Xóa */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              showConfirm({
                                message: "Bạn có chắc muốn xóa ChatBot này?",
                                onConfirm: async () => {
                                  await handleDeleteBot(ai._id)
                                },
                              })
                            }}
                          >
                            <Icon icon="mdi:delete" className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {aiKeys.length === 0 && (
                <div className="text-gray-500 italic">Chưa có ChatBot nào.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {ConfirmDialog}
    </div>
  )
}
