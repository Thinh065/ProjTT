"use client"
import { apiFetch } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function ProfilePage() {
  const [user, setUser] = useState(null) // <-- Thêm dòng này
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [ConfirmDialog, showConfirm] = useConfirmDialog()
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      setUser(user)
      setFormData({
        ...formData,
        name: user.name,
        email: user.email,
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      // Gọi API cập nhật tên trên server
      const { ok, data } = await apiFetch(`/api/users/${user._id}`, {
        method: "PATCH",
        body: { name: formData.name },
      })
      if (!ok) throw new Error(data.message)
      // Cập nhật localStorage và state
      const updatedUser = { ...user, name: data.name }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      setLoading(false)
      showConfirm({
        message: "Cập nhật thông tin thành công!",
        onlyClose: true,
        onConfirm: () => {
          window.location.reload()
        }
      })
    } catch (err) {
      setLoading(false)
      showConfirm({
        message: err.message || "Có lỗi xảy ra!",
        onlyClose: true
      })
    }
  }
  
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      showConfirm({ message: "Mật khẩu mới không khớp!", onlyClose: true }) // Thay alert
      return
    }
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const { ok, data } = await apiFetch(`/api/users/${user._id}/change-password`, {
        method: "POST",
        body: {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        },
      })
      if (!ok) throw new Error(data.message)
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      showConfirm({ message: "Đổi mật khẩu thành công!", onlyClose: true }) // Thay alert
    } catch (err) {
      showConfirm({ message: err.message, onlyClose: true }) // Thay alert
    }
    setLoading(false)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Hiển thị ảnh preview ngay lập tức
      setAvatarPreview(URL.createObjectURL(file));
      // Gửi file lên server như cũ
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData()
    formData.append("avatar", file)
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const { data } = await apiFetch(`/api/users/${user._id}/avatar`, { method: "POST", body: formData })
    if (data.avatar || data.user?.avatar) {
      // Thêm query string để ép tải lại ảnh mới, rồi reload trang để đồng bộ Header
      const avatarUrl = (data.avatar || data.user.avatar) + "?t=" + Date.now();
      localStorage.setItem("user", JSON.stringify({ ...user, avatar: avatarUrl }))
      window.location.reload();
    } else {
      setAvatarPreview(null)
      showConfirm({ message: data.message || "Upload ảnh thất bại", onlyClose: true })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (!user) return null

  return (
    <>
      {ConfirmDialog}
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl text-[#1d1530]">
        {/* Đổi ảnh đại diện */}
        <Card className="mb-6 sm:mb-8 bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
          <CardHeader>
            <CardTitle className="text-[#1d1530] font-bold">Ảnh đại diện</CardTitle>
            <CardDescription className="text-[#5d566f]">Cập nhật ảnh đại diện của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <img
                  src={avatarPreview || user.avatar || "/placeholder.svg"}
                  alt="avatar"
                  className="w-28 h-28 rounded-full object-cover border-2 border-[rgba(124,58,237,0.25)] ring-4 ring-[#f1edff] shadow-sm"
                />
                <label
                  htmlFor="avatar"
                  className="absolute bottom-1 right-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-full p-2 shadow-md cursor-pointer transition"
                >
                  <Icon icon="mdi:camera" className="w-4 h-4 text-white" />
                  <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thông tin tài khoản và Đổi mật khẩu */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Thông tin tài khoản */}
          <Card className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
            <CardHeader>
              <CardTitle className="text-[#1d1530] font-bold">Thông tin tài khoản</CardTitle>
              <CardDescription className="text-[#5d566f]">Cập nhật thông tin cơ bản</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#1d1530]">
                    Họ và tên
                  </label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="rounded-[12px] bg-white/90 border-[rgba(76,29,149,0.12)] text-[#1d1530] focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#1d1530]">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="rounded-[12px] bg-[#f1edff]/60 border-[rgba(76,29,149,0.12)] text-[#5d566f] disabled:opacity-80"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1d1530]">Vai trò</label>
                  <Input
                    value={user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                    disabled
                    className="rounded-[12px] bg-[#f1edff]/60 border-[rgba(76,29,149,0.12)] text-[#5d566f] disabled:opacity-80"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[12px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] transition"
                >
                  {loading ? (
                    <>
                      <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    "Cập nhật thông tin"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Đổi mật khẩu */}
          <Card className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
            <CardHeader>
              <CardTitle className="text-[#1d1530] font-bold">Đổi mật khẩu</CardTitle>
              <CardDescription className="text-[#5d566f]">
                Cập nhật mật khẩu để bảo mật tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="text-sm font-medium text-[#1d1530]">
                    Mật khẩu hiện tại
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    autoComplete="current-password"
                    className="rounded-[12px] bg-white/90 border-[rgba(76,29,149,0.12)] text-[#1d1530] focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium text-[#1d1530]">
                    Mật khẩu mới
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    autoComplete="new-password"
                    className="rounded-[12px] bg-white/90 border-[rgba(76,29,149,0.12)] text-[#1d1530] focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-[#1d1530]">
                    Xác nhận mật khẩu mới
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    className="rounded-[12px] bg-white/90 border-[rgba(76,29,149,0.12)] text-[#1d1530] focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[12px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium shadow-[0_8px_20px_-10px_rgba(124,58,237,0.55)] transition"
                >
                  {loading ? (
                    <>
                      <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    "Đổi mật khẩu"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
