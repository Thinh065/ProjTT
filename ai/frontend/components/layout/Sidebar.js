"use client"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function Sidebar({ user, isOpen, onClose }) {
  const router = useRouter()
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "mdi:view-dashboard",
    },
    {
      name: "Lịch sử chat",
      href: "/dashboard/history",
      icon: "mdi:history",
    },
    {
      name: "Thông tin cá nhân",
      href: "/dashboard/profile",
      icon: "mdi:account",
    },
  ]

  if (user?.role === "admin") {
    navigation.push({
      name: "Quản trị",
      href: "/dashboard/admin",
      icon: "mdi:shield-account",
    })
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon icon="mdi:robot" className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Multi ChatBot AI</span>
            </div>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={onClose}>
              <Icon icon="mdi:close" className="w-5 h-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "Khách"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                )}
                onClick={onClose}
              >
                <Icon icon={item.icon} className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <Icon icon="mdi:logout" className="w-5 h-5 mr-3" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
