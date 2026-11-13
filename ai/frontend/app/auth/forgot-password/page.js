"use client"

import Link from "next/link"
import { Icon } from "@iconify/react"
import LightBackdrop from "@/components/landing/LightBackdrop"
import SpotlightCard from "@/components/landing/react-bits/SpotlightCard"
import StarBorder from "@/components/landing/react-bits/StarBorder"
import ShinyText from "@/components/landing/react-bits/ShinyText"
import ClickSpark from "@/components/landing/react-bits/ClickSpark"
import CyberFox from "@/components/landing/CyberFox"
import "@/components/landing/landing.css"
import "@/components/landing/landing-light.css"

export default function ForgotPasswordPage() {
  return (
    <ClickSpark sparkColor={["#7c3aed", "#a78bfa", "#c4b5fd"]} sparkCount={7} sparkRadius={26} duration={400}>
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-transparent text-[#1d1530] overflow-hidden">
        <LightBackdrop variant="trust" />

        <div className="relative z-10 w-full max-w-md">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors mb-4"
          >
            ← Quay lại đăng nhập
          </Link>

          <SpotlightCard
            theme="light"
            spotlightColor="#7c3aed"
            intensity={0.18}
            spotlightSize={300}
            borderGlow={0.88}
            style={{
              "--spotlight-card-surface": "rgba(255,255,255,.88)",
              "--spotlight-card-border": "rgba(76,29,149,.12)",
              "--spotlight-card-shadow": "0 12px 32px -18px rgba(76,29,149,.22)",
              borderRadius: "18px",
            }}
            className="w-full p-6 sm:p-8 rounded-[18px] bg-[rgba(255,255,255,.88)] backdrop-blur-xl border border-[rgba(76,29,149,.12)] shadow-[0_12px_32px_-18px_rgba(76,29,149,.22)]"
          >
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <CyberFox size={80} sleepy={false} label="Linh vật Cyber Fox" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1d1530]">
                <ShinyText text="Quên mật khẩu" color="#1d1530" shineColor="#7c3aed" speed={3} />
              </h1>
              <p className="text-xs text-[#5d566f] mt-1">Liên hệ quản trị viên để được cấp mật khẩu tạm</p>
            </div>

            <div className="text-xs text-[#5d566f] space-y-3 bg-[#7c3aed]/[0.06] p-4 rounded-xl border border-[rgba(76,29,149,.12)] text-left leading-relaxed">
              <p className="flex items-start gap-2">
                <Icon icon="mdi:information" className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                <span className="text-[#1d1530]">Gửi cho quản trị viên email bạn đã dùng để đăng ký tài khoản.</span>
              </p>
              <p className="flex items-start gap-2">
                <Icon icon="mdi:shield-key" className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                <span>
                  Quản trị viên sẽ đặt mật khẩu tạm cho bạn trong trang Quản trị. Sau khi đăng nhập, hãy đổi lại mật
                  khẩu trong trang Hồ sơ cá nhân.
                </span>
              </p>
            </div>

            <div className="pt-6">
              <StarBorder
                as={Link}
                href="/auth/login"
                className="w-full justify-center text-sm font-semibold"
                color="#f3e8ff"
                trailColor="#8b5cf6"
                backgroundColor="#7c3aed"
                textColor="#ffffff"
                borderColor="rgba(124, 58, 237, 0.35)"
                radius={10}
                thickness={1.5}
                stars={1}
                sparkle
              >
                Quay lại đăng nhập
              </StarBorder>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </ClickSpark>
  )
}
