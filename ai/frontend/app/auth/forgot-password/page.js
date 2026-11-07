"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Icon } from "@iconify/react"

// Hệ thống chưa có dịch vụ gửi email, nên việc đặt lại mật khẩu do quản trị viên thực hiện.
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Icon icon="mdi:lock-reset" className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
          <CardDescription>Liên hệ quản trị viên để được đặt lại mật khẩu</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>Gửi cho quản trị viên email bạn đã dùng để đăng ký.</p>
          <p>
            Quản trị viên sẽ đặt mật khẩu tạm cho bạn trong trang Quản trị. Sau khi đăng nhập, hãy đổi lại mật khẩu
            trong trang Hồ sơ.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">Quay lại đăng nhập</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
