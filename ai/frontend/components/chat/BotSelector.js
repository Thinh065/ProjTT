"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function BotSelector({ bots, selectedBot, onSelectBot, onNewChat }) {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ChatBot AI</h2>
        <Button size="sm" onClick={onNewChat}>
          <Icon icon="mdi:plus" className="w-4 h-4 mr-2" />
          Chat mới
        </Button>
      </div>

      <div className="space-y-2">
        {bots.map((bot) => (
          <Card
            key={bot._id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedBot?.id === bot.id ? "ring-2 ring-primary" : "",
            )}
            onClick={() => onSelectBot(bot)}
          >
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bot.color)}>
                  <Icon icon={bot.icon} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{bot.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{bot.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
