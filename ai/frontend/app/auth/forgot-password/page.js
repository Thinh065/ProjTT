"use client"

import { useState } from "react"
import Link from "next/link"
import { Icon } from "@iconify/react"
import LightBackdrop from "@/components/landing/LightBackdrop"
import SpotlightCard from "@/components/landing/react-bits/SpotlightCard"
import StarBorder from "@/components/landing/react-bits/StarBorder"
import ShinyText from "@/components/landing/react-bits/ShinyText"
import ClickSpark from "@/components/landing/react-bits/ClickSpark"
import CyberFox from "@/components/landing/CyberFox"
import { apiFetch } from "@/lib/api"
import "@/components/landing/landing.css"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null) // { ok: boolean, message: string }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = email.trim()
    if (!trimmed) {
      setStatus({ ok: false, message: "Vui lòng nhập email bạn đã dùng đăng ký." })
      return
    }
    setSubmitting(true)
    setStatus(null)
    try {
      const { ok, data } = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: { email: trimmed },
        auth: false,
      })
      setStatus({
        ok,
        message:
          data?.message ||
          (ok ? "Đã gửi yêu cầu đặt lại mật khẩu tới quản trị viên." : "Không thể gửi yêu cầu, vui lòng thử lại."),
      })
    } finally {
      setSubmitting(false)
    }
  }

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
              <p className="text-xs text-[#5d566f] mt-1">Gửi yêu cầu để quản trị viên cấp mật khẩu tạm</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-[#1d1530] mb-1.5">
                  Email tài khoản
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                  className="w-full rounded-xl border border-[rgba(76,29,149,.14)] bg-white/90 px-3.5 py-2.5 text-sm text-[#1d1530] placeholder:text-[#8f88a3] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 focus:border-[#7c3aed] transition"
                />
              </div>

              {status && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                    status.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-[#fff1f2] border-[rgba(225,29,72,.25)] text-[#be123c]"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <StarBorder
                as="button"
                type="submit"
                disabled={submitting}
                className="w-full justify-center text-sm font-semibold disabled:opacity-60"
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
                {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu cấp mật khẩu tạm"}
              </StarBorder>
            </form>

            <div className="text-xs text-[#5d566f] space-y-2.5 bg-[#7c3aed]/[0.06] p-4 rounded-xl border border-[rgba(76,29,149,.12)] text-left leading-relaxed">
              <p className="flex items-start gap-2">
                <Icon icon="mdi:shield-key" className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                <span>
                  Sau khi bạn gửi yêu cầu, tài khoản sẽ được gắn nhãn <strong>Cần cấp lại MK</strong> trong trang Quản
                  trị để quản trị viên đặt mật khẩu tạm nhanh chóng.
                </span>
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </ClickSpark>
  )
}
