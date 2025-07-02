"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      // Gọi API cập nhật tên trên server
      const res = await fetch(`http://localhost:5000/api/users/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formData.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
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
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch(`http://localhost:5000/api/users/${user._id}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const formData = new FormData()
      formData.append("avatar", file)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      // SỬA ĐÚNG endpoint:
      const res = await fetch(`http://localhost:5000/api/users/${user._id}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (data.avatar || data.user?.avatar) {
        // Cập nhật localStorage và state
        const newUser = { ...user, avatar: data.avatar || data.user.avatar }
        localStorage.setItem("user", JSON.stringify(newUser))
        setUser(newUser)
        // Nếu dùng context hoặc redux, cũng cần cập nhật ở đó
      }
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
      <div className="container mx-auto p-6 max-w-2xl">
        {/* Đổi ảnh đại diện */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ảnh đại diện</CardTitle>
            <CardDescription>Cập nhật ảnh đại diện của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <img
                  src={user.avatar || "/placeholder.svg"}
                  alt="avatar"
                  className="w-28 h-28 rounded-full object-cover border"
                />
                <label htmlFor="avatar" className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow cursor-pointer">
                  <Icon icon="mdi:camera" className="w-5 h-5 text-gray-500" />
                  <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thông tin tài khoản và Đổi mật khẩu */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Thông tin tài khoản */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tài khoản</CardTitle>
              <CardDescription>Cập nhật thông tin cơ bản</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="font-medium">Họ và tên</label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    autoComplete="name" 
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="font-medium">Email</label>
                  <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  disabled 
                  className="bg-gray-50" 
                  autoComplete="username"/>
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Vai trò</label>
                  <Input value={user.role === "admin" ? "Quản trị viên" : "Người dùng"} disabled className="bg-gray-50" />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
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
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Cập nhật mật khẩu để bảo mật tài khoản</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="font-medium">Mật khẩu hiện tại</label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                    autoComplete="current-password" // thêm dòng này
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="font-medium">Mật khẩu mới</label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                    autoComplete="new-password" // thêm dòng này
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="font-medium">Xác nhận mật khẩu mới</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    autoComplete="new-password" // thêm dòng này
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
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
