"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import BotAvatar from "@/components/chat/BotAvatar"

// Bot tư vấn ESH (RAG) được xử lý riêng ở backend qua botId "esh-bot"
export const ESH_BOT = {
  _id: "esh-bot",
  name: "Tư vấn ESH",
  description: "Bot tư vấn ESH cho học sinh/phụ huynh dựa trên dữ liệu thực",
  icon: "mdi:school-outline",
  color: "bg-[#7c3aed]",
}

export default function BotSelector({ bots, selectedBot, onSelectBot }) {
  // Bot tư vấn ESH luôn xuất hiện đầu tiên
  const allBots = [ESH_BOT, ...bots]

  return (
    <div className="px-3 pt-3 pb-3 border-b border-[rgba(76,29,149,0.12)]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5d566f]">
          Mô hình ChatBot AI
        </h2>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#f1edff] text-[#5b21b6] border border-[rgba(124,58,237,0.22)]">
          {allBots.length} bots
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto w-full pr-1 custom-scrollbar">
        {allBots.map((bot) => {
          const isSelected = selectedBot?._id === bot._id
          return (
            <Card
              key={bot._id}
              className={cn(
                "cursor-pointer transition-all duration-150 w-full border rounded-[16px] min-h-12",
                isSelected
                  ? "bg-[#7c3aed] text-white border-[#7c3aed] shadow-[0_12px_28px_-14px_rgba(124,58,237,0.55)]"
                  : "bg-[rgba(255,255,255,0.82)] text-[#1d1530] border-[rgba(76,29,149,0.12)] hover:border-[#7c3aed]/35 hover:bg-[#f1edff]/60 shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)]"
              )}
              onClick={() => onSelectBot(bot)}
            >
              <CardContent className="py-2.5 px-3">
                <div className="flex items-center space-x-2.5 h-full">
                  <BotAvatar bot={bot} size="sm" selected={isSelected} />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3
                      className={cn(
                        "font-semibold text-xs text-left truncate",
                        isSelected ? "text-white" : "text-[#1d1530]"
                      )}
                    >
                      {bot.name}
                    </h3>
                    <p
                      className={cn(
                        "text-[11px] truncate text-left",
                        isSelected ? "text-[#f1edff]/90" : "text-[#5d566f]"
                      )}
                    >
                      {bot.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
