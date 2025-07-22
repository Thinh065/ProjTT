"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Header({ user, onMenuClick, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenuClick}>
            <Icon icon="mdi:menu" className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Multi ChatBot AI</h1>
        </div>
        <div className="relative" ref={ref}>
          <button
            className="flex items-center"
            onClick={() => setOpen((v) => !v)}
            aria-label="Tài khoản"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
              <div className="flex items-center space-x-3 p-4 border-b">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="py-2">
                <Link href="/dashboard">
                  <div className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                    <Icon icon="mdi:view-dashboard" className="w-5 h-5 mr-2" />
                    Dashboard
                  </div>
                </Link>
                <Link href="/dashboard/history">
                  <div className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                    <Icon icon="mdi:history" className="w-5 h-5 mr-2" />
                    Lịch sử chat
                  </div>
                </Link>
                <Link href="/dashboard/profile">
                  <div className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                    <Icon icon="mdi:account" className="w-5 h-5 mr-2" />
                    Thông tin cá nhân
                  </div>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/dashboard/admin">
                    <div className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                      <Icon icon="mdi:shield-account" className="w-5 h-5 mr-2" />
                      Quản trị
                    </div>
                  </Link>
                )}
              </div>
              <div className="border-t">
                <button
                  className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("token")
                      localStorage.removeItem("user")
                      router.push("/auth/login")
                    }
                    if (onLogout) onLogout()
                  }}
                >
                  <Icon icon="mdi:logout" className="w-5 h-5 mr-2" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
