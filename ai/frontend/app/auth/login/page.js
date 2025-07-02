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

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        showConfirm({ message: data.message || "Tài khoản hoặc mật khẩu không đúng", onlyClose: true })
        setLoading(false)
        return
      }
      if (data.user.status === "blocked") {
        showConfirm({
          message: "Tài khoản đã tạm thời bị chặn!",
          onlyClose: true,
          onConfirm: () => {
            router.push("/auth/login")
          }
        })
        setLoading(false)
        return
      }
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      setLoading(false)
      router.push("/dashboard")
    } catch (err) {
      showConfirm({ message: err.message || "Có lỗi xảy ra!", onlyClose: true })
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Icon icon="mdi:robot" className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
          <CardDescription>Đăng nhập vào tài khoản Multi ChatBot AI của bạn</CardDescription>
        </CardHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Trường username ẩn cho accessibility */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: "none" }}
            tabIndex={-1}
            aria-hidden="true"
            value={formData.email || ""}
            readOnly
          />
          <CardContent className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"} // <-- sửa dòng này
                  placeholder="********"
                  autoComplete="current-password"
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
            <div className="text-sm text-muted-foreground">Demo: admin@demo.com / user@demo.com (mật khẩu bất kỳ)</div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
            <div className="text-center text-sm space-y-2">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Quên mật khẩu?
              </Link>
              <div>
                Chưa có tài khoản?{" "}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
      {ConfirmDialog}
    </div>
  )
}
