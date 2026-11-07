"use client"

import { useEffect, useRef } from "react"

/**
 * Robot của ứng dụng (cùng hình với icon bot).
 * - Độ mở mắt lấy từ biến CSS --eyes-open (0 → 1) do trang đặt theo vị trí cuộn.
 * - Con ngươi nhìn theo con trỏ chuột.
 */
export default function Robot({ size = 160, className = "", label }) {
  const rootRef = useRef(null)
  const pupilsRef = useRef([])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let target = { x: 0, y: 0 }

    const apply = () => {
      frame = 0
      const r = root.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height * 0.52
      const dx = target.x - cx
      const dy = target.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, dist / 260)
      const ox = (dx / dist) * 5 * reach
      const oy = (dy / dist) * 4 * reach
      for (const p of pupilsRef.current) {
        if (p) p.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`
      }
    }

    const onMove = (e) => {
      target = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(apply)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <svg
      ref={rootRef}
      className={`lp-robot ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* ăng-ten */}
      <rect x="47" y="6" width="6" height="14" rx="3" className="lp-robot-metal" />
      <circle cx="50" cy="7" r="5.5" className="lp-robot-light" />
      {/* tai */}
      <rect x="4" y="44" width="10" height="22" rx="4" className="lp-robot-metal" />
      <rect x="86" y="44" width="10" height="22" rx="4" className="lp-robot-metal" />
      {/* đầu */}
      <rect x="12" y="20" width="76" height="66" rx="20" className="lp-robot-head" />
      {/* mặt */}
      <rect x="21" y="32" width="58" height="40" rx="14" className="lp-robot-face" />
      {/* mắt: nhóm ngoài co theo cuộn, nhóm trong chớp mắt */}
      {[37, 63].map((cx, i) => (
        <g key={cx} className="lp-robot-eye">
          <g className="lp-robot-blink">
            <ellipse cx={cx} cy="50" rx="7.5" ry="8.5" className="lp-robot-white" />
            <g ref={(el) => (pupilsRef.current[i] = el)} className="lp-robot-pupil">
              <circle cx={cx} cy="50" r="4" />
            </g>
          </g>
        </g>
      ))}
      {/* miệng */}
      <rect x="40" y="62" width="20" height="4" rx="2" className="lp-robot-mouth" />
    </svg>
  )
}
