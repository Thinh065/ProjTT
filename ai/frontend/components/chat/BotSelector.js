"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

// Bot tư vấn ESH (RAG) được xử lý riêng ở backend qua botId "esh-bot"
export const ESH_BOT = {
  _id: "esh-bot",
  name: "Tư vấn ESH",
  description: "Bot tư vấn ESH cho học sinh/phụ huynh dựa trên dữ liệu thực",
  icon: "mdi:robot",
  color: "bg-blue-500",
}

export default function BotSelector({ bots, selectedBot, onSelectBot }) {
  // Bot tư vấn ESH luôn xuất hiện đầu tiên
  const allBots = [ESH_BOT, ...bots];

  return (
    <div className="px-0 pt-4 pb-2 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ChatBot AI</h2>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto w-full custom-scrollbar">
        {allBots.map((bot) => (
          <Card
            key={bot._id}
            className={cn(
              "cursor-pointer transition-colors w-full border-2 rounded-xl min-h-12 bg-white hover:bg-gray-100",
              selectedBot?._id === bot._id
                ? "border-primary"
                : "border-black"
            )}
            onClick={() => onSelectBot(bot)}
          >
            <CardContent className="py-3 px-3"> 
              <div className="flex items-center space-x-2 h-full">
                {bot.image ? (
                  <img src={bot.image} alt={bot.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", bot.color || "bg-gray-700")}>
                    <Icon icon={bot.icon || "mdi:robot"} className="w-3 h-3 text-white" />
                  </div>
                )}
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