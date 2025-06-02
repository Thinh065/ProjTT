"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

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

    // Mock update profile
    setTimeout(() => {
      const updatedUser = {
        ...user,
        name: formData.name,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      setLoading(false)
      alert("Cập nhật thông tin thành công!")
    }, 1000)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      alert("Mật khẩu mới không khớp!")
      return
    }

    setLoading(true)

    // Mock change password
    setTimeout(() => {
      setLoading(false)
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      alert("Đổi mật khẩu thành công!")
    }, 1000)
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

  if (!user) return null

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Thông tin cá nhân</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Avatar & Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ảnh đại diện</CardTitle>
            <CardDescription>Cập nhật ảnh đại diện của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>{user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Icon icon="mdi:camera" className="w-4 h-4 mr-2" />
                      Thay đổi ảnh
                    </span>
                  </Button>
                </Label>
                <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>Cập nhật thông tin cơ bản</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Input value={user.role === "admin" ? "Quản trị viên" : "Người dùng"} disabled className="bg-gray-50" />
              </div>
              <Button type="submit" disabled={loading}>
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

        {/* Change Password */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
            <CardDescription>Cập nhật mật khẩu để bảo mật tài khoản</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={loading}>
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
  )
}
