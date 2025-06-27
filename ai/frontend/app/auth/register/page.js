"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function RegisterPage() {
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("http://localhost:5000/api/upload/avatar", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (data.url) {
        setFormData((prev) => ({ ...prev, avatar: data.url }))
      }
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      showConfirm({ message: "Mật khẩu xác nhận không khớp!", onlyClose: true })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          avatar: formData.avatar,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      showConfirm({
        message: "Đăng ký thành công! Vui lòng đăng nhập.",
        onlyClose: true,
        onConfirm: () => {
          router.push("/auth/login")
        }
      })
    } catch (err) {
      showConfirm({ message: err.message, onlyClose: true })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Đăng ký</CardTitle>
          <CardDescription>Tạo tài khoản Multi ChatBot AI mới</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Khung tròn chọn ảnh đại diện, click được */}
            <div className="flex justify-center mb-2">
              <label
                htmlFor="avatar"
                className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center shadow cursor-pointer hover:opacity-80 transition"
                style={{ position: "relative" }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="avatar preview"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <Icon icon="mdi:robot" className="w-12 h-12 text-gray-400" />
                )}
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {/* Icon máy ảnh nhỏ góc dưới nếu muốn */}
                <span className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow">
                  <Icon icon="mdi:camera" className="w-5 h-5 text-gray-500" />
                </span>
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nguyễn Văn T"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                "Đăng ký"
              )}
            </Button>
            <div className="text-center text-sm">
              Đã có tài khoản?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      {ConfirmDialog}
    </div>
  )
}
