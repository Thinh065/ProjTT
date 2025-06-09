"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

export default function BotSelector({ bots, selectedBot, onSelectBot }) {
  return (
    <div className="px-0 pt-4 pb-2 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ChatBot AI</h2>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto w-full custom-scrollbar">
        {bots.map((bot) => (
          <Card
            key={bot._id}
            className={cn(
              "cursor-pointer transition-colors w-full border-2 rounded-xl min-h-12 bg-white hover:bg-gray-100",
              selectedBot?.id === bot.id
                ? "border-primary"
                : "border-black"
            )}
            onClick={() => onSelectBot(bot)}
          >
            <CardContent className="py-3 px-3"> 
              <div className="flex items-center space-x-2 h-full">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", bot.color)}>
                  <Icon icon={bot.icon} className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-medium text-sm text-left">{bot.name}</h3>
                  <p className="text-xs text-gray-500 truncate text-left">{bot.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}