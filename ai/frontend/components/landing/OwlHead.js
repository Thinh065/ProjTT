"use client"

import { useEffect, useRef } from "react"

/**
 * Linh vật: đầu cú hoạt hình, lấy cảm hứng từ cú nhỏ (Athene noctua):
 * lông nâu lốm đốm trắng, lông mày trắng, mắt vàng.
 * - Độ mở mắt lấy từ biến CSS --eyes-open (0 → 1) do trang đặt theo vị trí cuộn.
 * - Lúc ngủ hiện mí mắt khép và chữ "z".
 * - Con ngươi nhìn theo con trỏ chuột.
 */

// Đốm lông trắng trên đỉnh đầu (cố định để SSR và client giống nhau)
const SPOTS = [
  [70, 52, 3.2], [86, 44, 2.6], [100, 41, 3], [114, 44, 2.6], [130, 52, 3.2],
  [62, 66, 2.4], [78, 60, 2.2], [94, 55, 2], [106, 55, 2], [122, 60, 2.2], [138, 66, 2.4],
  [56, 82, 2], [144, 82, 2], [86, 70, 1.6], [114, 70, 1.6],
]

export default function OwlHead({ size = 160, className = "", label, sleepy = true }) {
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
      const cy = r.top + r.height * 0.55
      const dx = target.x - cx
      const dy = target.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, dist / 280)
      const ox = (dx / dist) * 7 * reach
      const oy = (dy / dist) * 6 * reach
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
      className={`lp-owlhead ${sleepy ? "is-sleepy" : ""} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* chòm lông tai */}
      <path d="M44 74 L36 18 Q60 30 78 52 Z" className="owl-tuft" />
      <path d="M156 74 L164 18 Q140 30 122 52 Z" className="owl-tuft" />
      <path d="M48 66 L44 34 Q58 42 68 54 Z" className="owl-tuft-in" />
      <path d="M152 66 L156 34 Q142 42 132 54 Z" className="owl-tuft-in" />

      {/* đầu */}
      <path
        d="M100 36 C150 36 180 66 180 112 C180 160 146 188 100 188 C54 188 20 160 20 112 C20 66 50 36 100 36 Z"
        className="owl-head"
      />
      {SPOTS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="owl-spot" />
      ))}

      {/* đĩa mặt */}
      <circle cx="70" cy="112" r="38" className="owl-disc" />
      <circle cx="130" cy="112" r="38" className="owl-disc" />

      {/* má hồng */}
      <ellipse cx="46" cy="140" rx="10" ry="6" className="owl-blush" />
      <ellipse cx="154" cy="140" rx="10" ry="6" className="owl-blush" />

      {/* mắt: nhóm ngoài co theo cuộn, nhóm trong chớp */}
      {[70, 130].map((cx, i) => (
        <g key={cx}>
          <g className="owl-eye">
            <g className="owl-blink">
              <circle cx={cx} cy="112" r="25" className="owl-iris-ring" />
              <circle cx={cx} cy="112" r="21" className="owl-iris" />
              <g ref={(el) => (pupilsRef.current[i] = el)} className="owl-pupil">
                <circle cx={cx} cy="112" r="11" />
                <circle cx={cx + 4} cy="107" r="3.6" className="owl-glint" />
              </g>
            </g>
          </g>
          {/* mí mắt khép khi ngủ */}
          <path
            d={`M${cx - 20} 112 Q${cx} ${126} ${cx + 20} 112`}
            className="owl-lid"
          />
        </g>
      ))}

      {/* lông mày trắng hình chữ V */}
      <path d="M38 86 Q66 70 98 96" className="owl-brow" />
      <path d="M162 86 Q134 70 102 96" className="owl-brow" />

      {/* mỏ */}
      <path d="M90 128 Q100 124 110 128 L100 150 Z" className="owl-beak" />

      {/* zzz khi ngủ */}
      <g className="owl-zz">
        <text x="160" y="40">z</text>
        <text x="176" y="22" className="owl-z-small">z</text>
      </g>
    </svg>
  )
}
