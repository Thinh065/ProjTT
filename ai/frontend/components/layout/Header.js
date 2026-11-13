"use client"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import Link from "next/link"
import { logout } from "@/lib/api"
import CyberFox from "@/components/landing/CyberFox"
import ShinyText from "@/components/landing/react-bits/ShinyText"

export default function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md border-b border-[rgba(76,29,149,0.12)] px-4 py-2.5 sticky top-0 z-40 transition-colors shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[10px] bg-[#f1edff] border border-[rgba(124,58,237,0.24)] flex items-center justify-center p-0.5 group-hover:border-[#7c3aed] transition shadow-xs">
              <CyberFox size={26} sleepy={false} />
            </div>
            <div className="flex items-baseline gap-2">
              <ShinyText
                text="ProjTT"
                color="#1d1530"
                shineColor="#7c3aed"
                speed={4}
                className="text-lg font-bold tracking-tight text-[#1d1530]"
              />
              <span className="hidden sm:inline-block text-[10px] font-mono font-semibold text-[#5b21b6] px-2 py-0.5 rounded-full bg-[#f1edff] border border-[rgba(124,58,237,0.22)]">
                Multi-AI
              </span>
            </div>
          </Link>
        </div>

        <div className="relative" ref={ref}>
          <button
            className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-[rgba(255,255,255,0.82)] border border-[rgba(76,29,149,0.12)] hover:border-[#7c3aed]/40 hover:bg-[#f1edff]/60 transition shadow-xs"
            onClick={() => setOpen((v) => !v)}
            aria-label="Tài khoản"
          >
            <span className="text-xs font-medium text-[#1d1530] hidden sm:inline max-w-[120px] truncate">
              {user?.name || "Người dùng"}
            </span>
            <Avatar className="w-7 h-7 ring-2 ring-[#7c3aed]/30">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-xs bg-[#7c3aed] text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[rgba(255,255,255,0.96)] backdrop-blur-xl border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 p-4 border-b border-[rgba(76,29,149,0.12)] bg-[#f1edff]/50">
                <Avatar className="w-11 h-11 ring-2 ring-[#7c3aed]/35 shadow-sm">
                  <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-[#7c3aed] text-white font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#1d1530] truncate flex items-center gap-1.5">
                    <span className="truncate">{user?.name}</span>
                    {user?.role === "admin" && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.25)]">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5d566f] truncate">{user?.email}</div>
                </div>
              </div>

              <div className="p-2 space-y-0.5 text-sm text-[#1d1530]">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <div className="flex items-center px-3 py-2 rounded-[10px] hover:bg-[#f1edff] hover:text-[#6d28d9] cursor-pointer transition font-medium">
                    <Icon icon="mdi:view-dashboard-outline" className="w-4 h-4 mr-2.5 text-[#5d566f]" />
                    Dashboard
                  </div>
                </Link>
                <Link href="/dashboard/history" onClick={() => setOpen(false)}>
                  <div className="flex items-center px-3 py-2 rounded-[10px] hover:bg-[#f1edff] hover:text-[#6d28d9] cursor-pointer transition font-medium">
                    <Icon icon="mdi:history" className="w-4 h-4 mr-2.5 text-[#5d566f]" />
                    Lịch sử chat
                  </div>
                </Link>
                <Link href="/dashboard/profile" onClick={() => setOpen(false)}>
                  <div className="flex items-center px-3 py-2 rounded-[10px] hover:bg-[#f1edff] hover:text-[#6d28d9] cursor-pointer transition font-medium">
                    <Icon icon="mdi:account-outline" className="w-4 h-4 mr-2.5 text-[#5d566f]" />
                    Thông tin cá nhân
                  </div>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/dashboard/admin" onClick={() => setOpen(false)}>
                    <div className="flex items-center px-3 py-2 rounded-[10px] hover:bg-[#f1edff] cursor-pointer transition font-medium text-[#7c3aed] hover:text-[#6d28d9]">
                      <Icon icon="mdi:shield-account-outline" className="w-4 h-4 mr-2.5 text-[#7c3aed]" />
                      Quản trị hệ thống
                    </div>
                  </Link>
                )}
                <Link href="/" onClick={() => setOpen(false)}>
                  <div className="flex items-center px-3 py-2 rounded-[10px] hover:bg-[#f1edff] hover:text-[#6d28d9] cursor-pointer transition font-medium text-[#5d566f]">
                    <Icon icon="mdi:home-outline" className="w-4 h-4 mr-2.5 text-[#5d566f]" />
                    Trang chủ Landing
                  </div>
                </Link>
              </div>

              <div className="p-2 border-t border-[rgba(76,29,149,0.12)] bg-[#fbfaff]/70">
                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-[#be123c] hover:bg-[#fff1f2] rounded-[10px] transition font-medium"
                  onClick={() => {
                    if (onLogout) onLogout()
                    logout()
                  }}
                >
                  <Icon icon="mdi:logout" className="w-4 h-4 mr-2.5" />
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
