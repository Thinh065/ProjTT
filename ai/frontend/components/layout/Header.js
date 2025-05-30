"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"

export default function Header({ user, onMenuClick }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenuClick}>
            <Icon icon="mdi:menu" className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Multi ChatBot AI</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
