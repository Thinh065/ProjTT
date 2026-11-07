"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import { apiFetch, getStoredUser } from "@/lib/api"

const EMPTY_FORM = {
  name: "",
  description: "",
  apiKey: "",
  baseURL: "",
  model: "",
  image: "",
  referer: "",
  title: "",
}

const inputClass = "border rounded px-3 py-2 w-full"

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiKeys, setAiKeys] = useState([])
  const [aiForm, setAiForm] = useState(EMPTY_FORM)
  const [showAiForm, setShowAiForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const router = useRouter()
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  const notify = (message) => showConfirm({ message, onlyClose: true })

  useEffect(() => {
    const me = getStoredUser()
    if (me.role !== "admin") {
      router.replace("/dashboard")
      return
    }
    setCurrentUserId(me._id || me.id)
    fetchUsers()
    fetchAiKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { ok, data } = await apiFetch("/api/auth/users")
    setUsers(ok && Array.isArray(data) ? data : [])
    if (!ok) notify(data?.message || "Không tải được danh sách người dùng")
    setLoading(false)
  }

  const fetchAiKeys = async () => {
    const { ok, data } = await apiFetch("/api/apikeys/admin")
    setAiKeys(ok && Array.isArray(data) ? data : [])
  }

  const handleChangeRole = async (userId, newRole) => {
    const { ok, data } = await apiFetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      body: { role: newRole },
    })
    if (ok) setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: data.role } : u)))
    else notify(data?.message || "Lỗi khi đổi quyền")
  }

  const handleChangeStatus = async (userId, newStatus) => {
    if (userId === currentUserId) {
      notify("Không thể thay đổi trạng thái của chính bạn!")
      return
    }
    const { ok, data } = await apiFetch(`/api/users/${userId}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    })
    if (ok) {
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: data.status } : u)))
      notify(newStatus === "blocked" ? "Đã chặn người dùng!" : "Đã mở chặn người dùng!")
    } else {
      notify(data?.message || "Lỗi khi đổi trạng thái")
    }
  }

  const handleDeleteUser = (userId) => {
    if (userId === currentUserId) {
      notify("Không thể xóa chính bạn!")
      return
    }
    showConfirm({
      message: "Bạn có chắc chắn muốn xóa user này? Toàn bộ lịch sử chat của họ cũng bị xóa.",
      onConfirm: async () => {
        const { ok, data } = await apiFetch(`/api/users/${userId}`, { method: "DELETE" })
        if (ok) setUsers((prev) => prev.filter((u) => u._id !== userId))
        else notify(data?.message || "Lỗi khi xóa user")
      },
    })
  }

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(`Nhập mật khẩu tạm mới cho ${user.name} (ít nhất 6 ký tự):`)
    if (!newPassword) return
    const { ok, data } = await apiFetch(`/api/users/${user._id}/change-password`, {
      method: "POST",
      body: { newPassword },
    })
    notify(ok ? "Đã đặt lại mật khẩu. Hãy gửi mật khẩu tạm cho người dùng." : data?.message || "Lỗi khi đặt lại mật khẩu")
  }

  const handleAiFormChange = (e) => {
    setAiForm({ ...aiForm, [e.target.name]: e.target.value })
  }

  const handleAddAiKey = (e) => {
    e.preventDefault()
    showConfirm({
      message: "Bạn có chắc chắn muốn thêm ChatBot này?",
      onConfirm: async () => {
        const { ok, data } = await apiFetch("/api/apikeys", { method: "POST", body: aiForm })
        if (ok) {
          setShowAiForm(false)
          setAiForm(EMPTY_FORM)
          fetchAiKeys()
          notify("Thêm ChatBot thành công!")
        } else {
          notify(data?.message || "Lỗi khi thêm ChatBot")
        }
      },
    })
  }

  const handleAiImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append("image", file)
    const { ok, data } = await apiFetch("/api/upload/avatar", { method: "POST", body: formData, auth: false })
    if (ok && data.url) setAiForm((f) => ({ ...f, image: data.url }))
    else notify(data?.message || "Upload ảnh thất bại")
  }

  const handleDeleteBot = async (botId) => {
    const { ok, data } = await apiFetch(`/api/apikeys/${botId}`, { method: "DELETE" })
    if (!ok) notify(data?.message || "Lỗi khi xóa ChatBot")
    fetchAiKeys()
  }

  const handleHideAiKey = async (botId, hidden) => {
    const { ok, data } = await apiFetch(`/api/apikeys/${botId}/hide`, { method: "PATCH", body: { hidden } })
    if (!ok) notify(data?.message || "Lỗi khi cập nhật ChatBot")
    fetchAiKeys()
  }

  if (loading) return <div className="p-6">Đang tải...</div>

  return (
    <div className="container mx-auto p-6 h-screen overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Quản trị hệ thống</h1>

      <div className="grid gap-6">
        {/* Quản lý người dùng */}
        <Card>
          <CardHeader>
            <CardTitle>Quản lý người dùng</CardTitle>
            <CardDescription>Quản lý tài khoản, phân quyền và xem mức sử dụng token</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{(user.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
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
                    <TableCell>
                      <div className="text-sm">{(user.totalTokens || 0).toLocaleString("vi-VN")}</div>
                      <div className="text-xs text-gray-500">{user.chatCount || 0} cuộc trò chuyện</div>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild title="Xem lịch sử chat">
                          <Link
                            href={`/dashboard/history?userId=${user._id}&name=${encodeURIComponent(user.name || "")}`}
                          >
                            <Icon icon="mdi:history" className="w-4 h-4" />
                          </Link>
                        </Button>
                        {user._id !== currentUserId && (
                          <>
                            <Button
                              size="sm"
                              variant={user.status === "blocked" ? "outline" : "destructive"}
                              title={user.status === "blocked" ? "Mở chặn" : "Chặn"}
                              onClick={() =>
                                showConfirm({
                                  message:
                                    user.status === "blocked"
                                      ? "Bạn có muốn mở chặn người dùng này?"
                                      : "Bạn có muốn chặn người dùng này?",
                                  onConfirm: () =>
                                    handleChangeStatus(user._id, user.status === "blocked" ? "active" : "blocked"),
                                })
                              }
                            >
                              <Icon
                                icon={user.status === "blocked" ? "mdi:lock-open-outline" : "mdi:lock-outline"}
                                className="w-4 h-4"
                              />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={user.role === "admin" ? "Hạ xuống người dùng" : "Nâng lên quản trị viên"}
                              onClick={() => handleChangeRole(user._id, user.role === "admin" ? "user" : "admin")}
                            >
                              <Icon icon={user.role === "admin" ? "mdi:arrow-down" : "mdi:arrow-up"} className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" title="Đặt lại mật khẩu" onClick={() => handleResetPassword(user)}>
                              <Icon icon="mdi:key-variant" className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              title="Xóa"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <Icon icon="mdi:delete" className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quản lý ChatBot */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quản lý ChatBot</CardTitle>
            <CardDescription>
              Thêm các ChatBot dùng API tương thích OpenAI (OpenRouter, OpenAI, GitHub Models...). API key chỉ
              lưu ở server, người dùng không xem được.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Button className="bg-blue-600 text-white" onClick={() => setShowAiForm((v) => !v)}>
                {showAiForm ? "Đóng" : "Thêm ChatBot"}
              </Button>
            </div>
            {showAiForm && (
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-6 bg-white rounded-xl shadow border border-gray-200"
                onSubmit={handleAddAiKey}
              >
                <input name="name" value={aiForm.name} onChange={handleAiFormChange} placeholder="Tên AI" required className={inputClass} />
                <input name="description" value={aiForm.description} onChange={handleAiFormChange} placeholder="Mô tả ngắn" className={inputClass} />
                <input
                  name="apiKey"
                  value={aiForm.apiKey}
                  onChange={handleAiFormChange}
                  placeholder="API Key"
                  required
                  type="password"
                  className={inputClass}
                  autoComplete="off"
                />
                <input
                  name="baseURL"
                  value={aiForm.baseURL}
                  onChange={handleAiFormChange}
                  placeholder="Base URL (vd: https://openrouter.ai/api/v1)"
                  required
                  className={inputClass}
                />
                <input name="model" value={aiForm.model} onChange={handleAiFormChange} placeholder="Model" required className={inputClass} />
                <Button type="button" className="col-span-1 md:col-span-2" variant="outline" onClick={() => setShowAdvanced((v) => !v)}>
                  {showAdvanced ? "Ẩn trường nâng cao" : "Hiện trường nâng cao"}
                </Button>
                {showAdvanced && (
                  <>
                    <input name="image" value={aiForm.image} onChange={handleAiFormChange} placeholder="Ảnh đại diện (URL)" className={inputClass} />
                    <input name="referer" value={aiForm.referer} onChange={handleAiFormChange} placeholder="HTTP-Referer (optional)" className={inputClass} />
                    <input name="title" value={aiForm.title} onChange={handleAiFormChange} placeholder="X-Title (optional)" className={inputClass} />
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleAiImageChange} className="col-span-1 md:col-span-2" />
                {aiForm.image && <img src={aiForm.image} alt="avatar" className="w-12 h-12 rounded-full mt-2" />}
                <button type="submit" className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded">
                  Lưu ChatBot
                </button>
              </form>
            )}

            <h3 className="font-semibold mb-2">Danh sách ChatBot</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ChatBot</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiKeys.map((ai) => (
                  <TableRow key={ai._id}>
                    <TableCell className="flex items-center space-x-3">
                      {ai.image && <img src={ai.image} alt={ai.name} className="w-8 h-8 rounded-full" />}
                      <span className="font-medium">{ai.name}</span>
                    </TableCell>
                    <TableCell>{ai.model}</TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">{ai.baseURL}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-gray-500">{ai.apiKeyMasked}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ai.hidden ? "destructive" : "default"}>{ai.hidden ? "Tạm ẩn" : "Hiện"}</Badge>
                    </TableCell>
                    <TableCell>{ai.createdAt ? new Date(ai.createdAt).toLocaleString("vi-VN") : ""}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          className={`px-2 py-1 rounded text-xs ${ai.hidden ? "bg-green-500 text-white" : "bg-gray-300 text-black"}`}
                          onClick={() => handleHideAiKey(ai._id, !ai.hidden)}
                          title={ai.hidden ? "Hiện bot" : "Ẩn bot"}
                        >
                          {ai.hidden ? "Hiện" : "Ẩn"}
                        </button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            showConfirm({
                              message: "Bạn có chắc muốn xóa ChatBot này?",
                              onConfirm: () => handleDeleteBot(ai._id),
                            })
                          }
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {aiKeys.length === 0 && <div className="text-gray-500 italic">Chưa có ChatBot nào.</div>}
          </CardContent>
        </Card>
      </div>
      {ConfirmDialog}
    </div>
  )
}
