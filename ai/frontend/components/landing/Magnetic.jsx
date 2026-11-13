"use client"

import { useEffect, useRef } from "react"

/**
 * Magnetic — Nút hút nam châm vật lý lò xo 2 lớp (Shell + Inner Label Parallax)
 * - Khi đưa chuột vào vùng cảm ứng, khối nút bị hút nhẹ về phía con trỏ theo định luật Hooke.
 * - Phần tử con đánh dấu [data-magnetic-label] dịch chuyển thêm một nhịp nhỏ tạo chiều sâu xúc giác.
 * - Tự tắt vòng lặp rAF (0% CPU) ngay khi nút đã hồi về vị trí cân bằng (0, 0).
 */
export default function Magnetic({
  children,
  strength = 0.28,
  innerStrength = 0.14,
  range = 52,
  className = "",
}) {
  const outerRef = useRef(null)

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const inner = outer.querySelector("[data-magnetic-label]")
    let raf = 0
    let last = 0
    const pos = { x: 0, y: 0, vx: 0, vy: 0 }
    const target = { x: 0, y: 0 }

    const step = (now) => {
      raf = 0
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000))
      last = now

      // Lò xo tới hạn (stiffness = 210, damping = 19)
      const ax = (target.x - pos.x) * 210 - pos.vx * 19
      const ay = (target.y - pos.y) * 210 - pos.vy * 19
      pos.vx += ax * dt
      pos.vy += ay * dt
      pos.x += pos.vx * dt
      pos.y += pos.vy * dt

      outer.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0)`
      if (inner) {
        const ratio = innerStrength / Math.max(strength, 0.01)
        const ix = pos.x * ratio
        const iy = pos.y * ratio
        inner.style.transform = `translate3d(${ix.toFixed(2)}px, ${iy.toFixed(2)}px, 0)`
      }

      const moving =
        Math.hypot(target.x - pos.x, target.y - pos.y) > 0.04 ||
        Math.hypot(pos.vx, pos.vy) > 0.08
      if (moving) {
        raf = requestAnimationFrame(step)
      } else if (target.x === 0 && target.y === 0) {
        outer.style.transform = ""
        if (inner) inner.style.transform = ""
      }
    }

    const wake = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(step)
      }
    }

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      const rect = outer.getBoundingClientRect()
      const cx = rect.left - pos.x + rect.width / 2
      const cy = rect.top - pos.y + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const halfW = rect.width / 2 + range
      const halfH = rect.height / 2 + range

      if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
        const pull = 1 - Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH) * 0.35
        target.x = dx * strength * pull
        target.y = dy * strength * pull
        wake()
      } else if (target.x !== 0 || target.y !== 0) {
        target.x = 0
        target.y = 0
        wake()
      }
    }

    const onLeave = () => {
      target.x = 0
      target.y = 0
      wake()
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [strength, innerStrength, range])

  return (
    <span ref={outerRef} className={`lp-magnetic ${className}`}>
      {children}
    </span>
  )
}
