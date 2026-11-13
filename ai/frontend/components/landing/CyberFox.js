"use client"

import { useId } from "react"

/**
 * Linh vật: Cáo Công Nghệ (CyberFox / Kitsune AI)
 * Thiết kế đầu cáo robot hoạt hình thân thiện, dễ thương cho học sinh & phụ huynh:
 * - Tông màu chủ đạo: Tím Hoàng Gia (#7c3aed), Tím Lavender sáng (#ddd6fe) và Xanh Lơ (#22d3ee).
 * - Tương phản rõ ràng trên cả nền sáng (#fbfaff / #ffffff) lẫn nền tối (#070410).
 * - Mắt tròn sáng và hai đường cong mỉm cười cho hoạt ảnh chớp mắt.
 */

export default function CyberFox({ size = 170, className = "", label, animated = false }) {
  const id = useId()
  const paint = (name) => `url(#${id}-${name})`

  return (
    <svg
      className={`lp-cyberfox ${animated ? "cf-animated" : ""} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        {/* Vỏ giáp đầu & tai cáo: Tím Hoàng Gia tươi sáng, nổi bật trên cả nền trắng và nền tối */}
        <linearGradient id={`${id}-shell-grad`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="52%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>

        {/* Viền khung đầu: sáng ở đỉnh (nổi trên nền tối) và đậm ở đáy (nổi trên nền trắng) */}
        <linearGradient id={`${id}-rim-grad`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        {/* Má & mõm cáo hai tông màu: Trắng ánh tím sang Tím Lavender nhạt (#ddd6fe) */}
        <linearGradient id={`${id}-cheek-fur`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>

        {/* Lòng tai trong: Tím phấn dịu (#ddd6fe) */}
        <linearGradient id={`${id}-ear-inner`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>

        {/* Màn hình kính Visor: Tím chàm sâu làm nổi bật đôi mắt phát sáng */}
        <linearGradient id={`${id}-visor-screen`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="52%" stopColor="#2e1065" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Viền neon kính Visor: Xanh lơ (#22d3ee) hòa quyện Tím nhạt (#ddd6fe) và Tím (#7c3aed) */}
        <linearGradient id={`${id}-visor-rim`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        {/* Hiệu ứng phát sáng dịu cho chi tiết LED */}
        <filter id={`${id}-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Vòng Halo AI lơ lửng trên đầu */}
      <g className="cf-halo" filter={paint("glow")}>
        <ellipse
          cx="80"
          cy="17"
          rx="19"
          ry="4.2"
          fill="none"
          stroke={paint("visor-rim")}
          strokeWidth="2"
          strokeDasharray="7 4"
        />
        <circle cx="80" cy="13" r="3.2" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.2" />
      </g>

      {/* Tai trái robot cáo */}
      <g className="cf-ear cf-ear-left">
        <path
          d="M 27 68 C 19 48 16 28 21 17 C 23 12 29 12 35 17 C 46 25 56 35 64 46 Z"
          fill={paint("shell-grad")}
          stroke={paint("rim-grad")}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M 33 59 C 27 44 24 30 27 22 C 28 19 31 19 35 22 C 42 28 49 36 55 45 Z"
          fill={paint("ear-inner")}
          stroke="#c4b5fd"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Mạch tín hiệu trong tai trái */}
        <path
          d="M 33 29 L 39 42 L 47 45"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="33" cy="29" r="2.5" fill="#22d3ee" filter={paint("glow")} />
        <circle cx="22" cy="15" r="2.2" fill="#22d3ee" />
      </g>

      {/* Tai phải robot cáo */}
      <g className="cf-ear cf-ear-right">
        <path
          d="M 133 68 C 141 48 144 28 139 17 C 137 12 131 12 125 17 C 114 25 104 35 96 46 Z"
          fill={paint("shell-grad")}
          stroke={paint("rim-grad")}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M 127 59 C 133 44 136 30 133 22 C 132 19 129 19 125 22 C 118 28 111 36 105 45 Z"
          fill={paint("ear-inner")}
          stroke="#c4b5fd"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Mạch tín hiệu trong tai phải */}
        <path
          d="M 127 29 L 121 42 L 113 45"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="127" cy="29" r="2.5" fill="#22d3ee" filter={paint("glow")} />
        <circle cx="138" cy="15" r="2.2" fill="#22d3ee" />
      </g>

      {/* Cổ áo robot & lõi năng lượng AI */}
      <path
        d="M 55 133 Q 80 142 105 133 L 100 145 Q 80 151 60 145 Z"
        fill="#5b21b6"
        stroke="#ddd6fe"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="142" r="4.2" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.3" filter={paint("glow")} />

      {/* Khối đầu chính (Vỏ robot tím #7c3aed dáng má cáo bầu bĩnh, thân thiện) */}
      <path
        d="M 80 31
           C 112 31 133 51 135 78
           C 142 86 144 98 137 109
           C 129 123 105 136 80 139
           C 55 136 31 123 23 109
           C 16 98 18 86 25 78
           C 27 51 48 31 80 31 Z"
        fill={paint("shell-grad")}
        stroke={paint("rim-grad")}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Viền phản quang trên đỉnh đầu giúp nổi bật trên nền tối */}
      <path
        d="M 48 42 Q 80 28 112 42"
        fill="none"
        stroke="#ddd6fe"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* Mặt nạ má & mõm cáo màu tím nhạt (#ddd6fe / #f3e8ff) đặc trưng loài cáo */}
      <path
        d="M 80 92
           C 89 92 98 86 118 86
           C 129 86 136 93 132 105
           C 125 119 103 131 80 134
           C 57 131 35 119 28 105
           C 24 93 31 86 42 86
           C 62 86 71 92 80 92 Z"
        fill={paint("cheek-fur")}
        stroke="#c4b5fd"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Đệm tai nghe / khớp robot hai bên thái dương */}
      <rect
        x="15"
        y="68"
        width="11"
        height="21"
        rx="5.5"
        fill={paint("shell-grad")}
        stroke="#ddd6fe"
        strokeWidth="1.5"
      />
      <line x1="20.5" y1="73.5" x2="20.5" y2="83.5" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" />

      <rect
        x="134"
        y="68"
        width="11"
        height="21"
        rx="5.5"
        fill={paint("shell-grad")}
        stroke="#ddd6fe"
        strokeWidth="1.5"
      />
      <line x1="139.5" y1="73.5" x2="139.5" y2="83.5" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" />

      {/* Huy hiệu AI trên trán & rãnh kỹ thuật số */}
      <path d="M 55 46 L 68 53" stroke="#ddd6fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M 105 46 L 92 53" stroke="#ddd6fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M 72 43 L 80 36 L 88 43 L 80 51 Z"
        fill="#ddd6fe"
        stroke="#22d3ee"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="43.5" r="2.2" fill="#7c3aed" />

      {/* KÍNH VISOR HUD PHÁT SÁNG */}
      <g className="cf-visor-group">
        {/* Khung kính cong ôm theo sống mũi cáo */}
        <path
          d="M 31 65
             C 44 55 64 55 80 57
             C 96 55 116 55 129 65
             C 135 73 133 89 124 94
             C 110 99 94 95 80 90
             C 66 95 50 99 36 94
             C 27 89 25 73 31 65 Z"
          fill={paint("visor-screen")}
          stroke={paint("visor-rim")}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Ánh phản chiếu mặt kính cong */}
        <path
          d="M 39 65 C 54 59 68 59 80 60 C 92 59 106 59 121 65 C 117 69 98 66 80 66 C 62 66 43 69 39 65 Z"
          fill="#ffffff"
          opacity="0.18"
        />

        <g className="cf-eyes-open">
          {[56, 104].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="77" rx="10" ry="11.5" fill="#f5f3ff" />
              <ellipse cx={cx} cy="78" rx="5.5" ry="6.5" fill="#6d28d9" />
              <circle cx={cx - 1.7} cy="75.3" r="2.3" fill="#ffffff" />
            </g>
          ))}
        </g>
        {animated && (
          <path
            className="cf-eyes-closed"
            d="M 46 79 Q 56 67 66 79 M 94 79 Q 104 67 114 79"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Má hồng pastel & vệt râu LED công nghệ */}
      <ellipse cx="42" cy="107" rx="7" ry="4" fill="#c4b5fd" opacity="0.75" />
      <ellipse cx="118" cy="107" rx="7" ry="4" fill="#c4b5fd" opacity="0.75" />
      <path d="M 31 102 L 41 104" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M 33 109 L 42 109" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 129 102 L 119 104" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M 127 109 L 118 109" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />

      {/* Mũi cáo nhỏ xinh & miệng cười thân thiện */}
      <path
        d="M 73.5 103.5 Q 80 101 86.5 103.5 Q 87.5 108 80 112.5 Q 72.5 108 73.5 103.5 Z"
        fill="#4c1d95"
        stroke="#7c3aed"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <ellipse cx="78.5" cy="105.2" rx="2.6" ry="1.1" fill="#ddd6fe" opacity="0.9" />
      <path
        d="M 80 112.5 L 80 116.5 M 71.5 117.5 Q 75.8 122 80 116.8 Q 84.2 122 88.5 117.5"
        fill="none"
        stroke="#5b21b6"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

    </svg>
  )
}
