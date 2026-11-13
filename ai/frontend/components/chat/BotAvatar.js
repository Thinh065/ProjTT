"use client"

import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"

// Logo hãng theo model (Simple Icons + màu thương hiệu). Khớp theo tiền tố "hãng/model"
// của OpenRouter, hoặc theo tên model (GitHub Models: "gpt-4o", "Phi-4"...).
const BRANDS = [
  { match: /^nvidia\/|nemotron/, icon: "simple-icons:nvidia", color: "#76B900" },
  { match: /^baidu\/|ernie/, icon: "simple-icons:baidu", color: "#2932E1" },
  { match: /^google\/|gemini|gemma/, icon: "simple-icons:googlegemini", color: "#8E75B2" },
  { match: /^anthropic\/|claude/, icon: "simple-icons:claude", color: "#D97757" },
  { match: /^openai\/|gpt|(^|\/)o[1-9]\b/, icon: "simple-icons:openai", color: "#10A37F" },
  { match: /^meta(-llama)?\/|llama/, icon: "simple-icons:meta", color: "#0467DF" },
  { match: /^mistralai\/|mistral|mixtral|codestral/, icon: "simple-icons:mistralai", color: "#FA520F" },
  { match: /^deepseek\/|deepseek/, icon: "simple-icons:deepseek", color: "#4D6BFE" },
  { match: /^qwen\/|qwen/, icon: "simple-icons:qwen", color: "#615CED" },
  { match: /^alibaba\//, icon: "simple-icons:alibabacloud", color: "#FF6A00" },
  { match: /^microsoft\/|(^|\/)phi-/, icon: "simple-icons:microsoft", color: "#5E5E5E" },
  { match: /^perplexity\/|sonar/, icon: "simple-icons:perplexity", color: "#1FB8CD" },
  { match: /^huggingface(h4)?\//, icon: "simple-icons:huggingface", color: "#FF9D00" },
]

export function botBrand(bot) {
  if (!bot || bot.icon) return null // bot có icon riêng (vd. Tư vấn ESH) thì giữ nguyên
  const key = `${bot.model || ""} ${bot.name || ""}`.toLowerCase().trim()
  return BRANDS.find((brand) => brand.match.test(key)) || null
}

const SIZES = {
  sm: { box: "w-7 h-7 rounded-[10px]", icon: "w-4 h-4" },
  md: { box: "w-8 h-8 rounded-[12px]", icon: "w-[18px] h-[18px]" },
  lg: { box: "w-16 h-16 rounded-[18px]", icon: "w-8 h-8" },
}

export default function BotAvatar({ bot, size = "md", selected = false, className }) {
  const s = SIZES[size] || SIZES.md
  if (bot?.image) {
    return (
      <img
        src={bot.image}
        alt={bot.name || "Bot"}
        className={cn(s.box, "object-cover flex-shrink-0 ring-1", selected ? "ring-white/40" : "ring-[rgba(76,29,149,0.12)]", className)}
      />
    )
  }
  const brand = botBrand(bot)
  return (
    <div
      className={cn(
        s.box,
        "flex items-center justify-center flex-shrink-0 shadow-xs border",
        brand || selected ? "bg-white" : "bg-[#f1edff]",
        selected ? "border-white/60" : brand ? "border-[rgba(76,29,149,0.12)]" : "border-[rgba(124,58,237,0.22)]",
        className
      )}
      title={bot?.model || bot?.name}
    >
      <Icon
        icon={brand?.icon || bot?.icon || "mdi:robot"}
        className={cn(s.icon, !brand && "text-[#7c3aed]")}
        style={brand ? { color: brand.color } : undefined}
        aria-hidden="true"
      />
    </div>
  )
}
