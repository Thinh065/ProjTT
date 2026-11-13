"use client"

/*
 * Nền SÁNG cố định phía sau toàn trang (xem AGENT_HANDOFF.md). Tải động, không render phía server.
 *
 *  - "converge" (mẫu D, trang chủ — người dùng chốt 2026-11-10): Particles có đường nối,
 *     3 màu tím / xanh lơ / bạc hà tượng trưng 3 bot.
 *  - "trust" (trang đăng nhập/đăng ký/quên mật khẩu): DotGrid trên nền giấy trắng + vầng tím đầu trang.
 */

import dynamic from "next/dynamic"

const Particles = dynamic(() => import("./react-bits/Particles"), { ssr: false })
const DotGrid = dynamic(() => import("./react-bits/DotGrid"), { ssr: false })

function Layer({ variant }) {
  if (variant === "converge") {
    return (
      <Particles
        lightMode
        particleColors={["#6d28d9", "#0e7490", "#047857"]}
        particleCount={280}
        particleSpread={15}
        layout="even"
        speed={0.07}
        particleBaseSize={95}
        sizeRandomness={1}
        connections
        connectionDistance={140}
        glow={0.4}
        twinkle={0.25}
        hoverEffect="parallax"
        opacity={0.8}
      />
    )
  }
  return (
    <DotGrid
      dotSize={3}
      gap={22}
      baseColor="#d8d1f0"
      activeColor="#7c3aed"
      proximity={150}
      glow={0.25}
      opacity={0.9}
    />
  )
}

export default function LightBackdrop({ variant = "converge" }) {
  return (
    <div className={`lp-light-bg lp-light-bg--${variant}`} aria-hidden="true">
      <div className="lp-light-rb">
        <Layer variant={variant} />
      </div>
      {variant === "trust" && <span className="lp-light-glow" />}
    </div>
  )
}
