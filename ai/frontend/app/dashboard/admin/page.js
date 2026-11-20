"use client"

import { useEffect, useRef, useState } from "react"
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
import BotAvatar from "@/components/chat/BotAvatar"

const EMPTY_FORM = {
  name: "",
  description: "",
  apiKey: "",
  baseURL: "",
  model: "",
  image: "",
  referer: "",
  title: "",
  clearApiKey: false,
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
  const [editingBotId, setEditingBotId] = useState(null)
  const [showBotApiKey, setShowBotApiKey] = useState(false)
  const [submittingBot, setSubmittingBot] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingBotIds, setCheckingBotIds] = useState({})
  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [eshStats, setEshStats] = useState(null)
  const [clearingEshCache, setClearingEshCache] = useState(false)

  const aiFormRef = useRef(null)
  const formSessionRef = useRef(0)
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
    fetchEshStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đóng hộp thoại đặt lại mật khẩu bằng phím Escape
  useEffect(() => {
    if (!resetTarget) return
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !resetSubmitting) {
        setResetTarget(null)
        setResetPassword("")
        setShowResetPassword(false)
        setResetError("")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resetTarget, resetSubmitting])

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

  const fetchEshStats = async () => {
    const { ok, data } = await apiFetch("/api/chatbot/esh-knowledge")
    if (ok && data) setEshStats(data)
  }

  const handleClearEshCache = () => {
    if (clearingEshCache) return
    showConfirm({
      message: "Bạn có chắc muốn xóa toàn bộ câu trả lời đã lưu trong bộ nhớ đệm của bot tư vấn ESH?",
      onConfirm: async () => {
        setClearingEshCache(true)
        try {
          const { ok, data } = await apiFetch("/api/chatbot/esh-cache/clear", { method: "POST" })
          if (ok) {
            setEshStats((prev) => (prev ? { ...prev, cachedAnswers: 0 } : prev))
            notify(data?.message || "Đã xóa bộ nhớ đệm câu trả lời của bot ESH.")
          } else {
            notify(data?.message || "Không thể xóa bộ nhớ đệm ESH")
          }
        } finally {
          setClearingEshCache(false)
        }
      },
    })
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

  const handleOpenResetPassword = (user) => {
    setResetTarget({
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
    })
    setResetPassword("")
    setShowResetPassword(false)
    setResetError("")
  }

  const closeResetModal = () => {
    if (resetSubmitting) return
    setResetTarget(null)
    setResetPassword("")
    setShowResetPassword(false)
    setResetError("")
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetTarget || resetSubmitting) return
    if (resetPassword.length < 6) {
      setResetError("Mật khẩu tạm phải có ít nhất 6 ký tự.")
      return
    }
    setResetSubmitting(true)
    setResetError("")
    try {
      const { ok, data } = await apiFetch(`/api/users/${resetTarget._id}/change-password`, {
        method: "POST",
        body: { newPassword: resetPassword },
      })
      if (ok) {
        const targetId = resetTarget._id
        const targetLabel = resetTarget.name || resetTarget.email
        setUsers((prev) => prev.map((u) => (u._id === targetId ? { ...u, resetRequestedAt: null } : u)))
        setResetTarget(null)
        setResetPassword("")
        setShowResetPassword(false)
        notify(`Đã đặt lại mật khẩu cho ${targetLabel}. Hãy gửi mật khẩu tạm cho người dùng.`)
      } else {
        setResetError(data?.message || "Lỗi khi đặt lại mật khẩu")
      }
    } finally {
      setResetSubmitting(false)
    }
  }

  const resetAiForm = () => {
    formSessionRef.current += 1
    setUploadingImage(false)
    setEditingBotId(null)
    setAiForm(EMPTY_FORM)
    setShowAdvanced(false)
    setShowBotApiKey(false)
    setShowAiForm(false)
  }

  const openCreateBotForm = () => {
    formSessionRef.current += 1
    setUploadingImage(false)
    setEditingBotId(null)
    setAiForm(EMPTY_FORM)
    setShowAdvanced(false)
    setShowBotApiKey(false)
    setShowAiForm(true)
  }

  const handleStartEditBot = (bot) => {
    formSessionRef.current += 1
    setUploadingImage(false)
    setEditingBotId(bot._id)
    setAiForm({
      name: bot.name || "",
      description: bot.description || "",
      apiKey: "",
      baseURL: bot.baseURL || "",
      model: bot.model || "",
      image: bot.image || "",
      referer: bot.referer || "",
      title: bot.title || "",
      clearApiKey: false,
    })
    setShowAdvanced(Boolean(bot.image || bot.referer || bot.title))
    setShowBotApiKey(false)
    setShowAiForm(true)
    setTimeout(() => {
      aiFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 60)
  }

  const handleAiFormChange = (e) => {
    const { name, value } = e.target
    setAiForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "apiKey" && value.trim() !== "" ? { clearApiKey: false } : {}),
    }))
  }

  const editingBot = editingBotId ? aiKeys.find((b) => b._id === editingBotId) || null : null
  const hasPrivateApiKey =
    Boolean(editingBot?.apiKeyMasked) &&
    editingBot.apiKeyMasked !== "Key dùng chung (.env)" &&
    editingBot.apiKeyMasked !== "Chưa cấu hình"
  const isOpenRouterBaseUrl = (aiForm.baseURL || "").toLowerCase().includes("openrouter.ai")
  const canClearPrivateKey = Boolean(editingBotId && hasPrivateApiKey && isOpenRouterBaseUrl)

  const handleSubmitAiForm = async (e) => {
    e.preventDefault()
    if (submittingBot || uploadingImage) return

    if (editingBotId) {
      setSubmittingBot(true)
      try {
        const payload = {
          name: aiForm.name,
          description: aiForm.description,
          baseURL: aiForm.baseURL,
          model: aiForm.model,
          image: aiForm.image,
          referer: aiForm.referer,
          title: aiForm.title,
          apiKey: aiForm.apiKey,
          clearApiKey: Boolean(canClearPrivateKey && aiForm.clearApiKey),
        }
        const { ok, data } = await apiFetch(`/api/apikeys/${editingBotId}`, {
          method: "PATCH",
          body: payload,
        })
        if (ok && data) {
          setAiKeys((prev) => prev.map((b) => (b._id === editingBotId ? data : b)))
          resetAiForm()
          notify("Cập nhật ChatBot thành công!")
        } else {
          notify(data?.message || "Lỗi khi cập nhật ChatBot")
        }
      } finally {
        setSubmittingBot(false)
      }
      return
    }

    showConfirm({
      message: "Bạn có chắc chắn muốn thêm ChatBot này?",
      onConfirm: async () => {
        setSubmittingBot(true)
        try {
          const { clearApiKey: _omit, ...createPayload } = aiForm
          const { ok, data } = await apiFetch("/api/apikeys", { method: "POST", body: createPayload })
          if (ok) {
            resetAiForm()
            fetchAiKeys()
            notify("Thêm ChatBot thành công!")
          } else {
            notify(data?.message || "Lỗi khi thêm ChatBot")
          }
        } finally {
          setSubmittingBot(false)
        }
      },
    })
  }

  const handleAiImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const sessionId = formSessionRef.current
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const { ok, data } = await apiFetch("/api/upload/avatar", { method: "POST", body: formData })
      if (formSessionRef.current !== sessionId) return
      if (ok && data.url) setAiForm((f) => ({ ...f, image: data.url }))
      else notify(data?.message || "Upload ảnh thất bại")
    } finally {
      if (formSessionRef.current === sessionId) {
        setUploadingImage(false)
      }
    }
  }

  const handleDeleteBot = async (botId) => {
    const { ok, data } = await apiFetch(`/api/apikeys/${botId}`, { method: "DELETE" })
    if (!ok) {
      notify(data?.message || "Lỗi khi xóa ChatBot")
      return
    }
    if (editingBotId === botId) resetAiForm()
    setAiKeys((prev) => prev.filter((b) => b._id !== botId))
  }

  const handleHideAiKey = async (botId, hidden) => {
    const { ok, data } = await apiFetch(`/api/apikeys/${botId}/hide`, { method: "PATCH", body: { hidden } })
    if (!ok) {
      notify(data?.message || "Lỗi khi cập nhật ChatBot")
      return
    }
    setAiKeys((prev) => prev.map((b) => (b._id === botId ? { ...b, hidden: Boolean(hidden) } : b)))
  }

  const handleCheckAllBots = async () => {
    if (checkingAll || aiKeys.length === 0) return
    setCheckingAll(true)
    try {
      const { ok, data } = await apiFetch("/api/apikeys/check", { method: "POST" })
      if (ok && Array.isArray(data)) {
        const healthMap = new Map(data.map((item) => [String(item._id), item.health]))
        setAiKeys((prev) =>
          prev.map((bot) =>
            healthMap.has(String(bot._id)) ? { ...bot, health: healthMap.get(String(bot._id)) } : bot
          )
        )
        const okCount = data.filter((item) => item.health?.ok === true).length
        const failCount = data.length - okCount
        notify(`Đã kiểm tra ${data.length} ChatBot: ${okCount} hoạt động tốt, ${failCount} lỗi.`)
      } else {
        notify(data?.message || "Không thể kiểm tra tình trạng ChatBot")
      }
    } finally {
      setCheckingAll(false)
    }
  }

  const handleCheckSingleBot = async (botId) => {
    if (checkingBotIds[botId] || checkingAll) return
    setCheckingBotIds((prev) => ({ ...prev, [botId]: true }))
    try {
      const { ok, data } = await apiFetch(`/api/apikeys/${botId}/check`, { method: "POST" })
      if (ok && data?.health) {
        setAiKeys((prev) => prev.map((bot) => (bot._id === botId ? { ...bot, health: data.health } : bot)))
      } else {
        notify(data?.message || "Không thể kiểm tra ChatBot này")
      }
    } finally {
      setCheckingBotIds((prev) => {
        const next = { ...prev }
        delete next[botId]
        return next
      })
    }
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
                      <div className="flex flex-wrap items-center gap-1.5">
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
                        {user.resetRequestedAt && (
                          <Badge
                            title={`Yêu cầu lúc: ${new Date(user.resetRequestedAt).toLocaleString("vi-VN")}`}
                            className="bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-medium whitespace-nowrap cursor-pointer"
                            onClick={() => handleOpenResetPassword(user)}
                          >
                            Cần cấp lại MK
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-[#1d1530] font-mono tabular-nums">
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
                              onClick={() => handleOpenResetPassword(user)}
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
              Thêm, chỉnh sửa và kiểm tra kết nối các ChatBot dùng API tương thích OpenAI (OpenRouter, OpenAI,
              GitHub Models...). API key chỉ lưu ở server, người dùng không xem được.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={submittingBot || uploadingImage}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white rounded-[11px] font-medium px-4 py-2 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] inline-flex items-center gap-2"
                onClick={() => {
                  if (showAiForm && !editingBotId) {
                    resetAiForm()
                  } else {
                    openCreateBotForm()
                  }
                }}
              >
                <Icon icon={showAiForm && !editingBotId ? "mdi:close" : "mdi:plus"} className="w-4 h-4" />
                {showAiForm && !editingBotId ? "Đóng" : editingBotId ? "Thêm ChatBot mới" : "Thêm ChatBot"}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={aiKeys.length === 0 || checkingAll}
                onClick={handleCheckAllBots}
                className="rounded-[11px] border-[rgba(124,58,237,0.24)] bg-white/90 text-[#5b21b6] hover:bg-[#f1edff] hover:text-[#4c1d95] hover:border-[#7c3aed]/40 font-medium px-4 py-2 inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Icon
                  icon={checkingAll ? "mdi:loading" : "mdi:pulse"}
                  className={`w-4 h-4 text-[#7c3aed] ${checkingAll ? "animate-spin" : ""}`}
                />
                {checkingAll ? "Đang kiểm tra tất cả..." : "Kiểm tra tất cả"}
              </Button>
            </div>

            {showAiForm && (
              <form
                ref={aiFormRef}
                className="scroll-mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-5 sm:p-6 bg-[#f6f3ff]/80 rounded-[16px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.18)] border border-[rgba(76,29,149,0.12)]"
                onSubmit={handleSubmitAiForm}
              >
                <div className="col-span-1 md:col-span-2 flex items-center justify-between gap-3 pb-3 border-b border-[rgba(76,29,149,0.1)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-white border border-[rgba(124,58,237,0.22)] text-[#7c3aed]">
                      <Icon icon={editingBotId ? "mdi:pencil-outline" : "mdi:robot-outline"} className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-[#1d1530]">
                      {editingBotId ? "Chỉnh sửa ChatBot" : "Thêm ChatBot mới"}
                    </h3>
                    {editingBotId && (editingBot?.name || aiForm.name) && (
                      <span className="inline-flex items-center rounded-full bg-white/90 border border-[rgba(124,58,237,0.22)] px-2.5 py-0.5 text-xs font-semibold text-[#5b21b6]">
                        {editingBot?.name || aiForm.name}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={resetAiForm}
                    disabled={submittingBot || uploadingImage}
                    title="Đóng biểu mẫu"
                    className="rounded-[9px] p-1.5 text-[#5d566f] hover:bg-white/80 hover:text-[#1d1530] transition disabled:opacity-50"
                  >
                    <Icon icon="mdi:close" className="w-4 h-4" />
                  </button>
                </div>

                <input
                  name="name"
                  value={aiForm.name}
                  onChange={handleAiFormChange}
                  placeholder="Tên AI"
                  required
                  className={inputClass}
                />
                <input
                  name="description"
                  value={aiForm.description}
                  onChange={handleAiFormChange}
                  placeholder="Mô tả ngắn"
                  className={inputClass}
                />

                <div className="relative">
                  <input
                    name="apiKey"
                    value={aiForm.apiKey}
                    onChange={handleAiFormChange}
                    placeholder={
                      editingBot
                        ? `API Key mới (để trống nếu giữ nguyên: ${editingBot.apiKeyMasked})`
                        : "API Key (để trống nếu dùng key OpenRouter trong .env)"
                    }
                    type={showBotApiKey ? "text" : "password"}
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotApiKey((v) => !v)}
                    title={showBotApiKey ? "Ẩn API Key" : "Hiện API Key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d566f] hover:text-[#6d28d9] transition"
                  >
                    <Icon icon={showBotApiKey ? "mdi:eye-off-outline" : "mdi:eye-outline"} className="w-4 h-4" />
                  </button>
                </div>

                <input
                  name="baseURL"
                  value={aiForm.baseURL}
                  onChange={handleAiFormChange}
                  placeholder="Base URL (vd: https://openrouter.ai/api/v1)"
                  required
                  className={inputClass}
                />

                {canClearPrivateKey && (
                  <label className="col-span-1 md:col-span-2 flex items-center gap-2.5 rounded-[12px] border border-[rgba(124,58,237,0.2)] bg-white/85 px-3.5 py-2.5 text-sm text-[#1d1530] cursor-pointer select-none hover:border-[#7c3aed]/40 transition">
                    <input
                      type="checkbox"
                      checked={Boolean(aiForm.clearApiKey)}
                      onChange={(e) =>
                        setAiForm((prev) => ({
                          ...prev,
                          clearApiKey: e.target.checked,
                          apiKey: e.target.checked ? "" : prev.apiKey,
                        }))
                      }
                      className="h-4 w-4 rounded border-[rgba(76,29,149,0.25)] accent-[#7c3aed]"
                    />
                    <span className="text-xs sm:text-sm text-[#1d1530]">
                      Xóa API Key riêng — chuyển sang dùng{" "}
                      <code className="font-mono text-xs bg-[#f1edff] text-[#5b21b6] px-1.5 py-0.5 rounded">
                        OPENROUTER_API_KEY
                      </code>{" "}
                      chung (.env)
                    </span>
                  </label>
                )}

                <input
                  name="model"
                  value={aiForm.model}
                  onChange={handleAiFormChange}
                  placeholder="Model (vd: openai/gpt-4o-mini)"
                  required
                  className={`${inputClass} col-span-1 md:col-span-2`}
                />

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
                    <input
                      name="image"
                      value={aiForm.image}
                      onChange={handleAiFormChange}
                      placeholder="Ảnh đại diện (URL)"
                      className={inputClass}
                    />
                    <input
                      name="referer"
                      value={aiForm.referer}
                      onChange={handleAiFormChange}
                      placeholder="HTTP-Referer (tùy chọn)"
                      className={inputClass}
                    />
                    <input
                      name="title"
                      value={aiForm.title}
                      onChange={handleAiFormChange}
                      placeholder="X-Title (tùy chọn)"
                      className={`${inputClass} col-span-1 md:col-span-2`}
                    />
                  </>
                )}

                <div className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage || submittingBot}
                    onChange={handleAiImageChange}
                    className="text-sm text-[#5d566f] disabled:opacity-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-[10px] file:border file:border-[rgba(124,58,237,0.22)] file:text-xs file:font-medium file:bg-[#f1edff] file:text-[#5b21b6] hover:file:bg-[#e4dcff]"
                  />
                  {uploadingImage && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6d28d9]">
                      <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                      Đang tải ảnh lên...
                    </span>
                  )}
                  {aiForm.image && (
                    <div className="flex items-center gap-2">
                      <img
                        src={aiForm.image}
                        alt="avatar"
                        className="w-11 h-11 rounded-full ring-2 ring-[#7c3aed]/30 object-cover"
                      />
                      <button
                        type="button"
                        disabled={uploadingImage || submittingBot}
                        onClick={() => setAiForm((prev) => ({ ...prev, image: "" }))}
                        className="text-xs text-[#be123c] hover:underline disabled:opacity-50"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={resetAiForm}
                    disabled={submittingBot || uploadingImage}
                    className="px-5 py-2.5 bg-white/90 text-[#1d1530] text-sm font-medium rounded-[11px] border border-[rgba(76,29,149,0.12)] hover:bg-[#f1edff] hover:text-[#6d28d9] transition disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBot || uploadingImage}
                    className="px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white text-sm font-medium rounded-[11px] transition shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] inline-flex items-center justify-center gap-2"
                  >
                    {submittingBot && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />}
                    {editingBotId
                      ? submittingBot
                        ? "Đang lưu..."
                        : "Lưu thay đổi"
                      : submittingBot
                        ? "Đang thêm..."
                        : "Lưu ChatBot"}
                  </button>
                </div>
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
                {aiKeys.map((ai) => {
                  const isCheckingRow = Boolean(checkingBotIds[ai._id])
                  const isEditingRow = editingBotId === ai._id
                  return (
                    <TableRow
                      key={ai._id}
                      className={`border-b border-[rgba(76,29,149,0.08)] transition-colors ${
                        isEditingRow ? "bg-[#f1edff]/60 hover:bg-[#f1edff]/70" : "hover:bg-[#f1edff]/40"
                      }`}
                    >
                      <TableCell className="text-[#1d1530]">
                        <div className="flex items-center space-x-3">
                          <BotAvatar bot={ai} size="md" />
                          <div className="min-w-0">
                            <div className="font-medium text-[#1d1530] whitespace-nowrap">{ai.name}</div>
                            {ai.description && (
                              <div
                                className="text-xs text-[#5d566f] line-clamp-1 max-w-[180px]"
                                title={ai.description}
                              >
                                {ai.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#1d1530] font-mono text-xs">{ai.model}</TableCell>
                      <TableCell>
                        <span
                          className="text-xs text-[#5d566f] block max-w-[210px] truncate"
                          title={ai.baseURL}
                        >
                          {ai.baseURL}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-[#f1edff] text-[#4c1d95] px-2 py-0.5 rounded-md border border-[rgba(76,29,149,0.12)] font-mono whitespace-nowrap">
                          {ai.apiKeyMasked}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5 min-w-[145px]">
                          <div className="flex flex-wrap items-center gap-1.5">
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

                            {ai.health?.ok === true ? (
                              <span
                                title={
                                  ai.health.checkedAt
                                    ? `Kiểm tra lúc: ${new Date(ai.health.checkedAt).toLocaleString("vi-VN")}`
                                    : "Hoạt động bình thường"
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap tabular-nums"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                OK · {ai.health.latencyMs ?? 0}ms
                              </span>
                            ) : ai.health?.ok === false ? (
                              <span
                                title={
                                  ai.health.checkedAt
                                    ? `Kiểm tra lúc: ${new Date(ai.health.checkedAt).toLocaleString("vi-VN")}${
                                        ai.health.error ? ` — ${ai.health.error}` : ""
                                      }`
                                    : ai.health.error || "Lỗi kết nối"
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-[rgba(225,29,72,0.25)] bg-[#fff1f2] px-2.5 py-0.5 text-xs font-medium text-[#be123c] whitespace-nowrap"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-[#be123c]" />
                                Lỗi kết nối
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-[rgba(76,29,149,0.1)] bg-[#fbfaff] px-2.5 py-0.5 text-xs text-[#5d566f]/75 whitespace-nowrap">
                                Chưa kiểm tra
                              </span>
                            )}
                          </div>

                          {ai.health?.ok === false && ai.health.error && (
                            <p
                              className="text-[11px] leading-snug text-[#be123c] line-clamp-1 max-w-[200px]"
                              title={ai.health.error}
                            >
                              {ai.health.error}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#5d566f] whitespace-nowrap text-xs">
                        {ai.createdAt ? new Date(ai.createdAt).toLocaleString("vi-VN") : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            title="Kiểm tra kết nối"
                            disabled={isCheckingRow || checkingAll}
                            onClick={() => handleCheckSingleBot(ai._id)}
                            className="rounded-[10px] border-[rgba(76,29,149,0.12)] bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30 disabled:opacity-50"
                          >
                            <Icon
                              icon={isCheckingRow ? "mdi:loading" : "mdi:heart-pulse"}
                              className={`w-4 h-4 ${isCheckingRow ? "animate-spin text-[#7c3aed]" : ""}`}
                            />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            title="Chỉnh sửa ChatBot"
                            onClick={() => handleStartEditBot(ai)}
                            className={`rounded-[10px] border-[rgba(76,29,149,0.12)] ${
                              isEditingRow
                                ? "bg-[#f1edff] text-[#6d28d9] border-[#7c3aed]/40"
                                : "bg-white/80 text-[#1d1530] hover:bg-[#f1edff] hover:text-[#6d28d9] hover:border-[#7c3aed]/30"
                            }`}
                          >
                            <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                          </Button>
                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition border whitespace-nowrap ${
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
                            type="button"
                            size="sm"
                            variant="destructive"
                            title="Xóa ChatBot"
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
                  )
                })}
              </TableBody>
            </Table>
            {aiKeys.length === 0 && <div className="text-[#5d566f] italic mt-3 text-sm">Chưa có ChatBot nào.</div>}
          </CardContent>
        </Card>

        {/* Cơ sở tri thức & Bộ nhớ đệm Bot tư vấn ESH (RAG) */}
        {eshStats && (
          <Card className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-bold text-[#1d1530]">
                    Cơ sở tri thức & Bộ nhớ đệm Bot ESH (RAG)
                  </CardTitle>
                  <CardDescription className="text-[#5d566f]">
                    Model embedding: <code className="font-mono text-xs text-[#4c1d95]">{eshStats.embeddingModel}</code>{" "}
                    · Phiên bản chỉ mục: <code className="font-mono text-xs text-[#4c1d95]">{eshStats.version}</code>
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchEshStats}
                    className="px-3.5 py-2 bg-white/90 text-[#1d1530] rounded-[11px] font-medium text-sm border border-[rgba(76,29,149,0.12)] hover:bg-[#f1edff] hover:text-[#6d28d9] transition inline-flex items-center gap-1.5"
                  >
                    <Icon icon="mdi:refresh" className="w-4 h-4" />
                    Làm mới
                  </button>
                  <button
                    type="button"
                    disabled={clearingEshCache || !eshStats.cachedAnswers}
                    onClick={handleClearEshCache}
                    className="px-4 py-2 bg-[#fff1f2] text-[#be123c] rounded-[11px] font-medium text-sm border border-[rgba(225,29,72,0.25)] hover:bg-[#ffe4e6] transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Icon
                      icon={clearingEshCache ? "mdi:loading" : "mdi:broom"}
                      className={`w-4 h-4 ${clearingEshCache ? "animate-spin" : ""}`}
                    />
                    Xóa cache câu trả lời ({eshStats.cachedAnswers ?? 0})
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-[14px] border border-[rgba(76,29,149,0.1)] bg-[#fbfaff] p-3.5">
                  <div className="text-xs text-[#5d566f]">Tài liệu tuyển sinh đã nạp</div>
                  <div className="text-lg font-bold text-[#1d1530] mt-0.5">{eshStats.documentCount} tài liệu</div>
                </div>
                <div className="rounded-[14px] border border-[rgba(76,29,149,0.1)] bg-[#fbfaff] p-3.5">
                  <div className="text-xs text-[#5d566f]">Tổng số đoạn trích (chunks)</div>
                  <div className="text-lg font-bold text-[#1d1530] mt-0.5">
                    {eshStats.chunkCount} đoạn ·{" "}
                    <span className="text-xs font-medium text-emerald-700">
                      {eshStats.indexCached ? "Đã tạo vector cache" : "Tự tạo khi truy vấn"}
                    </span>
                  </div>
                </div>
                <div className="rounded-[14px] border border-[rgba(76,29,149,0.1)] bg-[#fbfaff] p-3.5">
                  <div className="text-xs text-[#5d566f]">Câu trả lời đang lưu cache (0 token)</div>
                  <div className="text-lg font-bold text-[#7c3aed] mt-0.5">{eshStats.cachedAnswers ?? 0} câu</div>
                </div>
              </div>

              {Array.isArray(eshStats.documents) && eshStats.documents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {eshStats.documents.map((doc) => (
                    <div
                      key={doc.file}
                      className="flex items-center justify-between gap-2 rounded-[11px] border border-[rgba(76,29,149,0.08)] bg-white/80 px-3.5 py-2 text-xs"
                    >
                      <span className="font-medium text-[#1d1530] truncate" title={doc.referenceFile || doc.file}>
                        {doc.file}
                      </span>
                      <span className="text-[#5d566f] whitespace-nowrap font-mono">
                        {doc.pageCount ? `${doc.pageCount} trang · ` : ""}
                        {doc.chunkCount} đoạn
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hộp thoại đặt lại mật khẩu người dùng */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1530]/40 backdrop-blur-sm p-4"
          onClick={closeResetModal}
        >
          <div
            className="bg-[rgba(255,255,255,0.96)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_18px_42px_-18px_rgba(76,29,149,0.28)] p-6 w-full max-w-md text-[#1d1530]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f1edff] border border-[rgba(124,58,237,0.22)] text-[#7c3aed]">
                  <Icon icon="mdi:key-variant" className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#1d1530]">Đặt lại mật khẩu</h3>
                  <p className="text-xs text-[#5d566f] truncate" title={resetTarget.email}>
                    {resetTarget.name}
                    {resetTarget.email ? ` · ${resetTarget.email}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeResetModal}
                disabled={resetSubmitting}
                title="Đóng"
                className="rounded-[9px] p-1.5 text-[#5d566f] hover:bg-[#f1edff] hover:text-[#1d1530] transition disabled:opacity-50"
              >
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5d566f] mb-1.5">
                  Mật khẩu tạm mới (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value)
                      if (resetError) setResetError("")
                    }}
                    placeholder="Nhập mật khẩu tạm cho người dùng..."
                    minLength={6}
                    autoFocus
                    autoComplete="new-password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    title={showResetPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d566f] hover:text-[#6d28d9] transition"
                  >
                    <Icon
                      icon={showResetPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                      className="w-4 h-4"
                    />
                  </button>
                </div>

                {resetPassword.length > 0 && resetPassword.length < 6 && !resetError && (
                  <p className="mt-1.5 text-xs text-[#be123c]">
                    Cần thêm {6 - resetPassword.length} ký tự nữa (tối thiểu 6 ký tự).
                  </p>
                )}
                {resetPassword.length >= 6 && !resetError && (
                  <p className="mt-1.5 text-xs text-emerald-700">
                    Độ dài hợp lệ ({resetPassword.length} ký tự).
                  </p>
                )}
                {resetError && (
                  <div className="mt-2 rounded-[10px] border border-[rgba(225,29,72,0.25)] bg-[#fff1f2] px-3 py-2 text-xs text-[#be123c]">
                    {resetError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeResetModal}
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-[#f1edff] text-[#1d1530] text-sm font-medium rounded-[11px] border border-[rgba(76,29,149,0.12)] hover:bg-[#e4dcff] transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetPassword.length < 6 || resetSubmitting}
                  className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm font-medium rounded-[11px] transition shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] inline-flex items-center gap-1.5"
                >
                  {resetSubmitting && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />}
                  {resetSubmitting ? "Đang lưu..." : "Đặt lại mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
