"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Mock forgot password - thay thế bằng API call thực tế
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1000)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Icon icon="mdi:check" className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Email đã được gửi</CardTitle>
            <CardDescription>Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full">Quay lại đăng nhập</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Icon icon="mdi:lock-reset" className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi hướng dẫn"
              )}
            </Button>
            <div className="text-center text-sm">
              <Link href="/auth/login" className="text-primary hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
