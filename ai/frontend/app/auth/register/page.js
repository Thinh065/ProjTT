"use client"

import { apiFetch } from "@/lib/api"
import { useEffect, useState } from "react"
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

export default function RegisterPage() {
  const [avatarPreview, setAvatarPreview] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const [ConfirmDialog, showConfirm] = useConfirmDialog()

  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email")
    if (email) setFormData((prev) => ({ ...prev, email }))
  }, [])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
      const form = new FormData()
      form.append("image", file)
      const { data } = await apiFetch("/api/upload/avatar", { method: "POST", body: form, auth: false })
      if (data.url) {
        setFormData((prev) => ({ ...prev, avatar: data.url }))
      } else {
        console.warn("Avatar upload error:", data.message)
      }
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      showConfirm({ message: "Mật khẩu xác nhận không khớp!", onlyClose: true })
      return
    }
    setLoading(true)
    try {
      const { ok, data } = await apiFetch("/api/auth/register", {
        method: "POST",
        auth: false,
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          avatar: formData.avatar,
        },
      })
      if (!ok) throw new Error(data.message)
      showConfirm({
        message: "Đăng ký thành công! Vui lòng đăng nhập.",
        onlyClose: true,
        onConfirm: () => {
          router.push("/auth/login")
        },
      })
    } catch (err) {
      showConfirm({ message: err.message, onlyClose: true })
    }
    setLoading(false)
  }

  return (
    <ClickSpark sparkColor={["#7c3aed", "#a78bfa", "#c4b5fd"]} sparkCount={7} sparkRadius={26} duration={400}>
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-transparent text-[#1d1530] overflow-hidden py-10">
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
            <div className="text-center mb-5">
              <div className="flex justify-center mb-2">
                <CyberFox size={72} sleepy={false} label="Linh vật Cyber Fox" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1d1530]">
                <ShinyText text="Tạo tài khoản ProjTT" color="#1d1530" shineColor="#7c3aed" speed={3} />
              </h1>
              <p className="text-xs text-[#5d566f] mt-1">Trải nghiệm mọi mô hình AI trong một giao diện duy nhất</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center mb-2">
                <label
                  htmlFor="avatar"
                  className="w-20 h-20 rounded-full bg-white border border-[rgba(76,29,149,.18)] flex items-center justify-center cursor-pointer hover:border-[#7c3aed] transition relative overflow-hidden group shadow-inner"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <Icon
                      icon="mdi:camera-plus"
                      className="w-8 h-8 text-[#5d566f] group-hover:text-[#7c3aed] transition"
                    />
                  )}
                  <input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="name" className="text-xs font-medium text-[#1d1530]">
                  Họ và tên
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-white border-[rgba(76,29,149,.18)] text-[#1d1530] placeholder:text-[#5d566f]/60 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                />
              </div>

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
                  autoComplete="username"
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

              <div className="space-y-1.5 text-left">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-[#1d1530]">
                  Xác nhận mật khẩu
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="bg-white border-[rgba(76,29,149,.18)] text-[#1d1530] placeholder:text-[#5d566f]/60 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]"
                />
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
                      Đang đăng ký...
                    </span>
                  ) : (
                    "Đăng ký"
                  )}
                </StarBorder>
              </div>

              <div className="text-center text-xs text-[#5d566f] pt-2">
                Đã có tài khoản?{" "}
                <Link href="/auth/login" className="text-[#7c3aed] font-medium hover:underline">
                  Đăng nhập
                </Link>
              </div>
            </form>
          </SpotlightCard>
        </div>
        {ConfirmDialog}
      </div>
    </ClickSpark>
  )
}
