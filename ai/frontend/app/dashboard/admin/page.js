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

const inputClass =
  "border border-[rgba(76,29,149,0.12)] bg-white/90 text-[#1d1530] placeholder:text-[#5d566f]/70 rounded-[12px] px-3.5 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition"

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

  if (loading) return <div className="p-6 text-[#5d566f] text-sm font-medium">Đang tải...</div>

  return (
    <div className="container mx-auto p-4 sm:p-6 text-[#1d1530]">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#1d1530] mb-6">Quản trị hệ thống</h1>

      <div className="grid gap-6">
        {/* Quản lý người dùng */}
        <Card className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#1d1530]">Quản lý người dùng</CardTitle>
            <CardDescription className="text-[#5d566f]">
              Quản lý tài khoản, phân quyền và xem mức sử dụng token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f6f3ff] border-b border-[rgba(76,29,149,0.12)] hover:bg-[#f6f3ff]">
                  <TableHead className="text-[#5d566f] font-semibold">Người dùng</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Email</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Vai trò</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Trạng thái</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Tokens</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Ngày tạo</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    className="border-b border-[rgba(76,29,149,0.08)] hover:bg-[#f1edff]/40 transition-colors"
                  >
                    <TableCell className="flex items-center space-x-3 text-[#1d1530]">
                      <Avatar className="ring-1 ring-[rgba(124,58,237,0.22)]">
                        <AvatarImage src={user.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback className="bg-[#f1edff] text-[#5b21b6] font-semibold">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-[#1d1530] whitespace-nowrap">{user.name}</span>
                    </TableCell>
                    <TableCell className="text-[#5d566f]">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={
                          user.role === "admin"
                            ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9] border-transparent font-medium whitespace-nowrap"
                            : "bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#f1edff] font-medium whitespace-nowrap"
                        }
                      >
                        {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "destructive"}
                        className={
                          user.status === "active"
                            ? "bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#f1edff] font-medium whitespace-nowrap"
                            : "bg-[#fff1f2] text-[#be123c] border border-[rgba(225,29,72,0.25)] hover:bg-[#fff1f2] font-medium whitespace-nowrap"
                        }
                      >
                        {user.status === "active" ? "Hoạt động" : "Bị chặn"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-[#1d1530] font-mono">
                        {(user.totalTokens || 0).toLocaleString("vi-VN")}
                      </div>
                      <div className="text-xs text-[#5d566f] whitespace-nowrap">
                        {user.chatCount || 0} cuộc trò chuyện
                      </div>
                    </TableCell>
                    <TableCell className="text-[#5d566f] whitespace-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          title="Xem lịch sử chat"
                          className="rounded-[10px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30"
                        >
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
                              className={
                                user.status === "blocked"
                                  ? "rounded-[10px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30"
                                  : "rounded-[10px] bg-[#fff1f2] text-[#be123c] border border-[rgba(225,29,72,0.25)] hover:bg-[#ffe4e6] shadow-none"
                              }
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
                              className="rounded-[10px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30"
                              onClick={() => handleChangeRole(user._id, user.role === "admin" ? "user" : "admin")}
                            >
                              <Icon icon={user.role === "admin" ? "mdi:arrow-down" : "mdi:arrow-up"} className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Đặt lại mật khẩu"
                              className="rounded-[10px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30"
                              onClick={() => handleResetPassword(user)}
                            >
                              <Icon icon="mdi:key-variant" className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              title="Xóa"
                              className="rounded-[10px] bg-[#fff1f2] text-[#be123c] border border-[rgba(225,29,72,0.25)] hover:bg-[#ffe4e6] shadow-none"
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
        <Card className="mt-2 bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#1d1530]">Quản lý ChatBot</CardTitle>
            <CardDescription className="text-[#5d566f]">
              Thêm các ChatBot dùng API tương thích OpenAI (OpenRouter, OpenAI, GitHub Models...). API key chỉ
              lưu ở server, người dùng không xem được.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Button
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-[11px] font-medium px-4 py-2 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)]"
                onClick={() => setShowAiForm((v) => !v)}
              >
                {showAiForm ? "Đóng" : "Thêm ChatBot"}
              </Button>
            </div>
            {showAiForm && (
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-5 sm:p-6 bg-[#f6f3ff]/80 rounded-[16px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.18)] border border-[rgba(76,29,149,0.12)]"
                onSubmit={handleAddAiKey}
              >
                <input name="name" value={aiForm.name} onChange={handleAiFormChange} placeholder="Tên AI" required className={inputClass} />
                <input name="description" value={aiForm.description} onChange={handleAiFormChange} placeholder="Mô tả ngắn" className={inputClass} />
                <input
                  name="apiKey"
                  value={aiForm.apiKey}
                  onChange={handleAiFormChange}
                  placeholder="API Key (để trống nếu dùng key OpenRouter trong .env)"
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
                <Button
                  type="button"
                  className="col-span-1 md:col-span-2 rounded-[11px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9]"
                  variant="outline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Ẩn trường nâng cao" : "Hiện trường nâng cao"}
                </Button>
                {showAdvanced && (
                  <>
                    <input name="image" value={aiForm.image} onChange={handleAiFormChange} placeholder="Ảnh đại diện (URL)" className={inputClass} />
                    <input name="referer" value={aiForm.referer} onChange={handleAiFormChange} placeholder="HTTP-Referer (optional)" className={inputClass} />
                    <input name="title" value={aiForm.title} onChange={handleAiFormChange} placeholder="X-Title (optional)" className={inputClass} />
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAiImageChange}
                  className="col-span-1 md:col-span-2 text-sm text-[#5d566f] file:mr-3 file:py-1.5 file:px-3 file:rounded-[10px] file:border file:border-[rgba(124,58,237,0.22)] file:text-xs file:font-medium file:bg-[#f1edff] file:text-[#5b21b6] hover:file:bg-[#e4dcff]"
                />
                {aiForm.image && (
                  <img
                    src={aiForm.image}
                    alt="avatar"
                    className="w-12 h-12 rounded-full mt-2 ring-2 ring-[#7c3aed]/30 object-cover"
                  />
                )}
                <button
                  type="submit"
                  className="col-span-1 md:col-span-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium py-2.5 rounded-[11px] transition shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)]"
                >
                  Lưu ChatBot
                </button>
              </form>
            )}

            <h3 className="font-semibold text-[#1d1530] mb-3">Danh sách ChatBot</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f6f3ff] border-b border-[rgba(76,29,149,0.12)] hover:bg-[#f6f3ff]">
                  <TableHead className="text-[#5d566f] font-semibold">ChatBot</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Model</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Base URL</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">API Key</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Trạng thái</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Ngày tạo</TableHead>
                  <TableHead className="text-[#5d566f] font-semibold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiKeys.map((ai) => (
                  <TableRow
                    key={ai._id}
                    className="border-b border-[rgba(76,29,149,0.08)] hover:bg-[#f1edff]/40 transition-colors"
                  >
                    <TableCell className="flex items-center space-x-3 text-[#1d1530]">
                      {ai.image && (
                        <img
                          src={ai.image}
                          alt={ai.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-[rgba(124,58,237,0.22)]"
                        />
                      )}
                      <span className="font-medium text-[#1d1530] whitespace-nowrap">{ai.name}</span>
                    </TableCell>
                    <TableCell className="text-[#1d1530] font-mono text-xs">{ai.model}</TableCell>
                    <TableCell>
                      <span className="text-xs text-[#5d566f]">{ai.baseURL}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-[#f1edff] text-[#4c1d95] px-2 py-0.5 rounded-md border border-[rgba(76,29,149,0.12)] font-mono">
                        {ai.apiKeyMasked}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ai.hidden ? "destructive" : "default"}
                        className={
                          ai.hidden
                            ? "bg-[#fff1f2] text-[#be123c] border border-[rgba(225,29,72,0.25)] hover:bg-[#fff1f2] font-medium whitespace-nowrap"
                            : "bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)] hover:bg-[#f1edff] font-medium whitespace-nowrap"
                        }
                      >
                        {ai.hidden ? "Tạm ẩn" : "Hiện"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#5d566f] whitespace-nowrap">
                      {ai.createdAt ? new Date(ai.createdAt).toLocaleString("vi-VN") : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition border ${
                            ai.hidden
                              ? "bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]"
                              : "bg-[#f1edff] text-[#5b21b6] border-[rgba(124,58,237,0.22)] hover:bg-[#e4dcff]"
                          }`}
                          onClick={() => handleHideAiKey(ai._id, !ai.hidden)}
                          title={ai.hidden ? "Hiện bot" : "Ẩn bot"}
                        >
                          {ai.hidden ? "Hiện" : "Ẩn"}
                        </button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-[10px] bg-[#fff1f2] text-[#be123c] border border-[rgba(225,29,72,0.25)] hover:bg-[#ffe4e6] shadow-none"
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
            {aiKeys.length === 0 && <div className="text-[#5d566f] italic mt-3 text-sm">Chưa có ChatBot nào.</div>}
          </CardContent>
        </Card>
      </div>
      {ConfirmDialog}
    </div>
  )
}
