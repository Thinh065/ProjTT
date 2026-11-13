"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bricolage_Grotesque } from "next/font/google"
import Header from "@/components/layout/Header"
import { apiFetch, getStoredUser } from "@/lib/api"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/auth/login")
      return
    }

    const stored = getStoredUser()
    setUser(stored)

    // Kiểm tra token còn hạn và lấy quyền/tên/avatar mới nhất từ server.
    // 401/403 (hết hạn, bị khóa) thì apiFetch tự đăng xuất; mất mạng thì giữ dữ liệu cũ.
    let cancelled = false
    apiFetch("/api/auth/me").then(({ ok, data }) => {
      if (cancelled || !ok || !data?.user) return
      // Giữ avatar có tham số chống cache (?t=) nếu vẫn là cùng ảnh
      const avatar = stored.avatar?.split("?")[0] === data.user.avatar ? stored.avatar : data.user.avatar
      const fresh = { ...stored, ...data.user, avatar }
      localStorage.setItem("user", JSON.stringify(fresh))
      setUser(fresh)
    })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!user) {
    return (
      <div className={`${bricolage.className} flex items-center justify-center min-h-screen bg-[#fbfaff] text-[#1d1530]`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#7c3aed]"></div>
      </div>
    )
  }

  return (
    <div
      className={`${bricolage.className} flex h-screen bg-[#fbfaff] text-[#1d1530] selection:bg-[#7c3aed]/20`}
      style={{
        backgroundImage:
          "radial-gradient(60% 50% at 15% 0%, rgba(196, 181, 253, 0.28), transparent 70%), radial-gradient(50% 45% at 90% 10%, rgba(165, 243, 252, 0.2), transparent 70%)",
      }}
    >
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent">{children}</main>
      </div>
    </div>
  )
}
