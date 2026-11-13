"use client"

import { apiFetch } from "@/lib/api"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { useConfirmDialog } from "@/components/ui/ConfirmDialog"
import LightBackdrop from "@/components/landing/LightBackdrop"
import SpotlightCard from "@/components/landing/react-bits/SpotlightCard"
import StarBorder from "@/components/landing/react-bits/StarBorder"
import ShinyText from "@/components/landing/react-bits/ShinyText"
import ClickSpark from "@/components/landing/react-bits/ClickSpark"
import CyberFox from "@/components/landing/CyberFox"
import "@/components/landing/landing.css"
import "@/components/landing/landing-light.css"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Tài khoản bị khóa: backend trả 403 kèm thông báo, hiện ở nhánh !ok bên dưới
      const { ok, data } = await apiFetch("/api/auth/login", { method: "POST", body: formData, auth: false })
      if (!ok) {
        showConfirm({ message: data.message || "Tài khoản hoặc mật khẩu không đúng", onlyClose: true })
        setLoading(false)
        return
      }
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      setLoading(false)
      router.push("/dashboard")
    } catch (err) {
      showConfirm({ message: err.message || "Có lỗi xảy ra!", onlyClose: true })
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <ClickSpark sparkColor={["#7c3aed", "#a78bfa", "#c4b5fd"]} sparkCount={7} sparkRadius={26} duration={400}>
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-transparent text-[#1d1530] overflow-hidden">
        <LightBackdrop variant="trust" />

        <div className="relative z-10 w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors mb-4"
          >
            ← Về trang chủ
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
                <ShinyText text="Đăng nhập ProjTT" color="#1d1530" shineColor="#7c3aed" speed={3} />
              </h1>
              <p className="text-xs text-[#5d566f] mt-1">Vào khung chat mọi mô hình AI trong một cửa sổ</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <input
                type="text"
                name="username"
                autoComplete="username"
                style={{ display: "none" }}
                tabIndex={-1}
                aria-hidden="true"
                value={formData.email || ""}
                readOnly
              />

              <div className="space-y-1.5 text-left">
                <Label htmlFor="email" className="text-xs font-medium text-[#1d1530]">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-white border-[rgba(76,29,149,.18)] text-[#1d1530] placeholder:text-[#5d566f]/60 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="password" className="text-xs font-medium text-[#1d1530]">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-white border-[rgba(76,29,149,.18)] text-[#1d1530] placeholder:text-[#5d566f]/60 pr-10 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 text-[#5d566f] hover:text-[#7c3aed] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <StarBorder
                  as="button"
                  type="submit"
                  disabled={loading}
                  className="w-full justify-center text-sm font-semibold"
                  color="#f3e8ff"
                  trailColor="#8b5cf6"
                  backgroundColor="#7c3aed"
                  textColor="#ffffff"
                  borderColor="rgba(124, 58, 237, 0.35)"
                  radius={10}
                  thickness={1.5}
                  stars={2}
                  sparkle
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </span>
                  ) : (
                    "Đăng nhập"
                  )}
                </StarBorder>
              </div>

              <div className="text-center text-xs text-[#5d566f] pt-3 space-y-1.5">
                <div>
                  <Link href="/auth/forgot-password" className="text-[#7c3aed] hover:underline font-medium">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div>
                  Chưa có tài khoản?{" "}
                  <Link href="/auth/register" className="text-[#7c3aed] font-medium hover:underline">
                    Đăng ký ngay
                  </Link>
                </div>
              </div>
            </form>
          </SpotlightCard>
        </div>

        {ConfirmDialog}
      </div>
    </ClickSpark>
  )
}
